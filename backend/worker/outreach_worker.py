#!/usr/bin/env python3
"""
Outreach Worker - Background automation for LinkedIn/Email campaigns

This worker runs independently from the main API server and processes
the message queue, sending messages via browser automation or MCP.

Usage:
    python outreach_worker.py [--once] [--dry-run] [--channel linkedin|email] [--use-mcp]

Options:
    --once      Process one message and exit
    --dry-run   Print what would be sent without actually sending
    --channel   Only process messages for specific channel
    --use-mcp   Use Chrome DevTools MCP instead of direct Playwright
"""

import asyncio
import argparse
import logging
import random
import sys
import os
import signal
import atexit
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import aiosqlite
import json

# Configuration
WORKER_DIR = Path(__file__).parent
OUTREACH_DB = WORKER_DIR.parent / "data" / "outreach.db"
PID_FILE = WORKER_DIR / "worker.pid"
LOG_FILE = WORKER_DIR / "outreach_worker.log"
COOKIES_FILE = WORKER_DIR / "linkedin_cookies.json"

# Rate limits (configurable via env)
MAX_DAILY_LINKEDIN = int(os.getenv('OUTREACH_MAX_DAILY_LINKEDIN', 20))
MAX_DAILY_EMAIL = int(os.getenv('OUTREACH_MAX_DAILY_EMAIL', 50))
MIN_DELAY_SECONDS = int(os.getenv('OUTREACH_MIN_DELAY_SECONDS', 30))
MAX_DELAY_SECONDS = int(os.getenv('OUTREACH_MAX_DELAY_SECONDS', 120))
ACTIVE_HOURS_START = int(os.getenv('OUTREACH_ACTIVE_HOURS_START', 8))
ACTIVE_HOURS_END = int(os.getenv('OUTREACH_ACTIVE_HOURS_END', 20))

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOG_FILE)
    ]
)
logger = logging.getLogger('outreach_worker')


def write_pid_file():
    """Write current PID to file."""
    PID_FILE.write_text(str(os.getpid()))
    logger.info(f"PID file written: {PID_FILE}")


def cleanup_pid_file():
    """Remove PID file on exit."""
    if PID_FILE.exists():
        PID_FILE.unlink()
        logger.info("PID file removed")


# Register cleanup
atexit.register(cleanup_pid_file)


class OutreachWorker:
    """Worker for processing outreach message queue."""

    def __init__(self, dry_run: bool = False, channel: str = None, use_mcp: bool = False):
        self.dry_run = dry_run
        self.channel_filter = channel
        self.use_mcp = use_mcp
        self.browser = None
        self.page = None
        self.daily_counts = {'linkedin': 0, 'email': 0}
        self.mcp_available = False

    async def init_browser(self):
        """Initialize browser for automation."""
        if self.dry_run:
            logger.info("Dry run mode - skipping browser initialization")
            return

        try:
            from playwright.async_api import async_playwright
            self.playwright = await async_playwright().start()

            # Use existing Chrome installation
            chrome_path = os.path.expanduser(
                '~/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome'
            )

            self.browser = await self.playwright.chromium.launch(
                headless=True,
                executable_path=chrome_path if os.path.exists(chrome_path) else None,
            )
            self.context = await self.browser.new_context(
                viewport={'width': 1280, 'height': 720},
                user_agent='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            )
            self.page = await self.context.new_page()

            # Load saved cookies if available
            if COOKIES_FILE.exists():
                try:
                    cookies = json.loads(COOKIES_FILE.read_text())
                    await self.context.add_cookies(cookies)
                    logger.info(f"Loaded {len(cookies)} saved cookies")
                except Exception as e:
                    logger.warning(f"Failed to load cookies: {e}")

            logger.info("Browser initialized successfully")
        except ImportError:
            logger.error("Playwright not installed. Run: pip install playwright && playwright install chromium")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize browser: {e}")
            raise

    async def save_cookies(self):
        """Save browser cookies for session persistence."""
        if self.context:
            try:
                cookies = await self.context.cookies()
                COOKIES_FILE.write_text(json.dumps(cookies, indent=2))
                logger.info(f"Saved {len(cookies)} cookies")
            except Exception as e:
                logger.warning(f"Failed to save cookies: {e}")

    async def check_linkedin_login(self) -> bool:
        """Check if currently logged into LinkedIn."""
        if not self.page:
            return False

        try:
            await self.page.goto('https://www.linkedin.com/feed/', wait_until='networkidle', timeout=30000)
            await asyncio.sleep(2)

            # Check if we're on the login page or feed
            current_url = self.page.url.lower()
            if 'login' in current_url or 'checkpoint' in current_url or 'authwall' in current_url:
                logger.warning("Not logged into LinkedIn")
                return False

            # Look for feed elements that indicate logged in state
            feed_selector = await self.page.query_selector('.feed-shared-update-v2, .scaffold-layout')
            if feed_selector:
                logger.info("LinkedIn login confirmed")
                await self.save_cookies()
                return True

            logger.warning("LinkedIn login state unclear")
            return False
        except Exception as e:
            logger.error(f"Error checking LinkedIn login: {e}")
            return False

    async def close_browser(self):
        """Close browser and cleanup."""
        if self.browser:
            await self.browser.close()
        if hasattr(self, 'playwright'):
            await self.playwright.stop()
        logger.info("Browser closed")

    def is_within_active_hours(self) -> bool:
        """Check if current time is within configured active hours."""
        current_hour = datetime.now().hour
        return ACTIVE_HOURS_START <= current_hour < ACTIVE_HOURS_END

    def is_under_daily_limit(self, channel: str) -> bool:
        """Check if under daily rate limit for channel."""
        limit = MAX_DAILY_LINKEDIN if channel == 'linkedin' else MAX_DAILY_EMAIL
        return self.daily_counts.get(channel, 0) < limit

    async def get_next_message(self) -> dict:
        """Fetch next queued message from database."""
        async with aiosqlite.connect(OUTREACH_DB) as db:
            db.row_factory = aiosqlite.Row

            query = """
                SELECT
                    mq.id as queue_id,
                    cc.*,
                    oc.name as campaign_name,
                    oc.channel,
                    oc.settings
                FROM message_queue mq
                JOIN campaign_contacts cc ON mq.campaign_contact_id = cc.id
                JOIN outreach_campaigns oc ON cc.campaign_id = oc.id
                WHERE mq.status = 'queued'
                AND oc.status = 'active'
            """
            params = []

            if self.channel_filter:
                query += " AND oc.channel = ?"
                params.append(self.channel_filter)

            query += " ORDER BY mq.id LIMIT 1"

            cursor = await db.execute(query, params)
            row = await cursor.fetchone()

        if not row:
            return None

        return dict(row)

    async def mark_message_sent(self, queue_id: str):
        """Mark message as sent in database."""
        now = datetime.utcnow().isoformat()

        async with aiosqlite.connect(OUTREACH_DB) as db:
            # Get campaign_contact_id
            cursor = await db.execute(
                "SELECT campaign_contact_id FROM message_queue WHERE id = ?",
                (queue_id,)
            )
            row = await cursor.fetchone()
            if not row:
                return

            cc_id = row[0]

            # Update queue
            await db.execute(
                "UPDATE message_queue SET status = 'sent', sent_at = ? WHERE id = ?",
                (now, queue_id)
            )

            # Update contact
            await db.execute(
                "UPDATE campaign_contacts SET status = 'sent', sent_at = ? WHERE id = ?",
                (now, cc_id)
            )

            # Log activity
            await db.execute("""
                INSERT INTO outreach_activity_log (id, campaign_id, contact_id, action, details, created_at)
                SELECT
                    'log_' || hex(randomblob(6)),
                    campaign_id,
                    ?,
                    'message_sent',
                    '{"automated": true}',
                    ?
                FROM campaign_contacts WHERE id = ?
            """, (cc_id, now, cc_id))

            await db.commit()

        logger.info(f"Marked message {queue_id} as sent")

    async def mark_message_failed(self, queue_id: str, error: str):
        """Mark message as failed in database."""
        async with aiosqlite.connect(OUTREACH_DB) as db:
            # Get campaign_contact_id
            cursor = await db.execute(
                "SELECT campaign_contact_id, attempts FROM message_queue WHERE id = ?",
                (queue_id,)
            )
            row = await cursor.fetchone()
            if not row:
                return

            cc_id, attempts = row

            # Update queue
            await db.execute(
                "UPDATE message_queue SET status = 'failed', attempts = ?, last_error = ? WHERE id = ?",
                (attempts + 1, error, queue_id)
            )

            # Update contact
            await db.execute(
                "UPDATE campaign_contacts SET status = 'failed', error_message = ? WHERE id = ?",
                (error, cc_id)
            )

            await db.commit()

        logger.error(f"Marked message {queue_id} as failed: {error}")

    async def send_linkedin_message(self, message_data: dict) -> bool:
        """Send a LinkedIn connection request or message."""
        if self.dry_run:
            logger.info(f"[DRY RUN] Would send LinkedIn message to {message_data['contact_name']}")
            logger.info(f"[DRY RUN] URL: {message_data.get('linkedin_url', 'N/A')}")
            logger.info(f"[DRY RUN] Message: {message_data['personalized_message'][:100]}...")
            return True

        linkedin_url = message_data.get('linkedin_url')
        if not linkedin_url:
            logger.error("No LinkedIn URL provided")
            return False

        try:
            # Navigate to LinkedIn profile
            await self.page.goto(linkedin_url, wait_until='networkidle')
            await asyncio.sleep(random.uniform(2, 4))

            # Check if logged in
            if 'login' in self.page.url.lower():
                logger.error("Not logged into LinkedIn - please log in manually first")
                return False

            # Look for Connect button
            connect_button = await self.page.query_selector('button:has-text("Connect")')
            if not connect_button:
                # Try "More" dropdown
                more_button = await self.page.query_selector('button:has-text("More")')
                if more_button:
                    await more_button.click()
                    await asyncio.sleep(1)
                    connect_button = await self.page.query_selector('button:has-text("Connect")')

            if not connect_button:
                logger.warning(f"Connect button not found for {message_data['contact_name']}")
                return False

            # Click Connect
            await connect_button.click()
            await asyncio.sleep(random.uniform(1, 2))

            # Look for "Add a note" button
            add_note_button = await self.page.query_selector('button:has-text("Add a note")')
            if add_note_button:
                await add_note_button.click()
                await asyncio.sleep(1)

                # Find the message textarea
                textarea = await self.page.query_selector('textarea[name="message"]')
                if textarea:
                    # Type message with human-like delays
                    message = message_data['personalized_message'][:300]  # LinkedIn limit
                    await textarea.fill(message)
                    await asyncio.sleep(random.uniform(0.5, 1.5))

            # Click Send
            send_button = await self.page.query_selector('button:has-text("Send")')
            if send_button:
                await send_button.click()
                await asyncio.sleep(2)
                logger.info(f"Successfully sent connection request to {message_data['contact_name']}")
                return True
            else:
                logger.error("Send button not found")
                return False

        except Exception as e:
            logger.error(f"Error sending LinkedIn message: {e}")
            return False

    async def send_email_message(self, message_data: dict) -> bool:
        """Send an email (placeholder for future implementation)."""
        if self.dry_run:
            logger.info(f"[DRY RUN] Would send email to {message_data.get('email', 'N/A')}")
            return True

        # TODO: Implement email sending via SMTP or API
        logger.warning("Email sending not yet implemented")
        return False

    async def process_message(self, message_data: dict) -> bool:
        """Process a single message from the queue."""
        channel = message_data['channel']
        queue_id = message_data['queue_id']

        logger.info(f"Processing {channel} message for {message_data['contact_name']}")

        try:
            if channel == 'linkedin':
                success = await self.send_linkedin_message(message_data)
            elif channel == 'email':
                success = await self.send_email_message(message_data)
            else:
                logger.error(f"Unknown channel: {channel}")
                success = False

            if success:
                await self.mark_message_sent(queue_id)
                self.daily_counts[channel] = self.daily_counts.get(channel, 0) + 1
                return True
            else:
                await self.mark_message_failed(queue_id, "Failed to send message")
                return False

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error processing message: {error_msg}")
            await self.mark_message_failed(queue_id, error_msg)
            return False

    async def run_once(self):
        """Process a single message and exit."""
        message = await self.get_next_message()
        if not message:
            logger.info("No messages in queue")
            return False

        if not self.dry_run:
            await self.init_browser()

        try:
            result = await self.process_message(message)
            return result
        finally:
            if not self.dry_run:
                await self.close_browser()

    async def run_continuous(self):
        """Run continuously, processing messages from the queue."""
        logger.info("Starting continuous processing mode")
        logger.info(f"Rate limits: LinkedIn={MAX_DAILY_LINKEDIN}/day, Email={MAX_DAILY_EMAIL}/day")
        logger.info(f"Active hours: {ACTIVE_HOURS_START}:00 - {ACTIVE_HOURS_END}:00")

        if not self.dry_run:
            await self.init_browser()

        try:
            while True:
                # Check if within active hours
                if not self.is_within_active_hours():
                    logger.info("Outside active hours, sleeping for 30 minutes")
                    await asyncio.sleep(30 * 60)
                    continue

                # Get next message
                message = await self.get_next_message()
                if not message:
                    logger.info("Queue empty, checking again in 5 minutes")
                    await asyncio.sleep(5 * 60)
                    continue

                channel = message['channel']

                # Check daily limit
                if not self.is_under_daily_limit(channel):
                    logger.info(f"Daily limit reached for {channel}, waiting until tomorrow")
                    # Calculate time until midnight
                    now = datetime.now()
                    tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0)
                    sleep_seconds = (tomorrow - now).total_seconds()
                    await asyncio.sleep(min(sleep_seconds, 3600))  # Max 1 hour
                    continue

                # Process message
                await self.process_message(message)

                # Random delay before next message
                delay = random.uniform(MIN_DELAY_SECONDS, MAX_DELAY_SECONDS)
                logger.info(f"Waiting {delay:.0f} seconds before next message")
                await asyncio.sleep(delay)

        except KeyboardInterrupt:
            logger.info("Received interrupt, shutting down")
        finally:
            if not self.dry_run:
                await self.close_browser()


async def run_login_flow():
    """Interactive login flow to capture LinkedIn session."""
    from playwright.async_api import async_playwright

    print("\n=== LinkedIn Login Setup ===\n")
    print("This will open a browser window for you to log into LinkedIn.")
    print("After logging in, the session will be saved for automation.\n")

    playwright = await async_playwright().start()

    # Use existing Chrome installation
    chrome_path = os.path.expanduser(
        '~/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome'
    )

    browser = await playwright.chromium.launch(
        headless=False,  # Visible for manual login
        executable_path=chrome_path if os.path.exists(chrome_path) else None,
    )

    context = await browser.new_context(
        viewport={'width': 1280, 'height': 800},
        user_agent='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    )

    page = await context.new_page()
    await page.goto('https://www.linkedin.com/login')

    print("Please log into LinkedIn in the browser window.")
    print("Once logged in and you see your feed, press Enter here to save the session...")

    # Wait for user to log in
    input()

    # Save cookies
    cookies = await context.cookies()
    COOKIES_FILE.write_text(json.dumps(cookies, indent=2))
    print(f"\nSaved {len(cookies)} cookies to {COOKIES_FILE}")

    await browser.close()
    await playwright.stop()

    print("\nSession saved! You can now run the worker in headless mode.")


async def check_login():
    """Check if LinkedIn session is valid."""
    print("Checking LinkedIn session...")

    worker = OutreachWorker(dry_run=False)
    await worker.init_browser()

    try:
        is_logged_in = await worker.check_linkedin_login()
        if is_logged_in:
            print("✓ LinkedIn session is valid")
        else:
            print("✗ Not logged into LinkedIn. Run with --login to set up session.")
    finally:
        await worker.close_browser()


async def main():
    parser = argparse.ArgumentParser(description='Outreach automation worker')
    parser.add_argument('--once', action='store_true', help='Process one message and exit')
    parser.add_argument('--dry-run', action='store_true', help='Print actions without sending')
    parser.add_argument('--channel', choices=['linkedin', 'email'], help='Filter by channel')
    parser.add_argument('--use-mcp', action='store_true', help='Use Chrome DevTools MCP')
    parser.add_argument('--login', action='store_true', help='Interactive LinkedIn login to save session')
    parser.add_argument('--check-login', action='store_true', help='Check if LinkedIn session is valid')
    args = parser.parse_args()

    # Handle login commands (don't require database)
    if args.login:
        await run_login_flow()
        return

    if args.check_login:
        await check_login()
        return

    # Verify database exists
    if not OUTREACH_DB.exists():
        logger.error(f"Database not found: {OUTREACH_DB}")
        logger.error("Make sure to start the API server first to initialize the database")
        sys.exit(1)

    # Write PID file for status tracking
    write_pid_file()

    # Handle signals for graceful shutdown
    def signal_handler(signum, frame):
        logger.info(f"Received signal {signum}, shutting down...")
        cleanup_pid_file()
        sys.exit(0)

    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)

    worker = OutreachWorker(dry_run=args.dry_run, channel=args.channel, use_mcp=args.use_mcp)

    # Check LinkedIn login if processing LinkedIn messages
    if not args.dry_run and (args.channel != 'email'):
        await worker.init_browser()
        is_logged_in = await worker.check_linkedin_login()
        if not is_logged_in:
            logger.error("Not logged into LinkedIn. Run with --login first.")
            await worker.close_browser()
            cleanup_pid_file()
            sys.exit(1)
        await worker.close_browser()

    try:
        if args.once:
            await worker.run_once()
        else:
            await worker.run_continuous()
    finally:
        cleanup_pid_file()


if __name__ == '__main__':
    asyncio.run(main())
