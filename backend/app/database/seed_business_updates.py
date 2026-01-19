"""
Seed Business Updates tables with sample data for testing.
Creates accounts, links team leaders, adds agents, defines metrics, and creates sample submissions.
"""
import aiosqlite
import asyncio
import uuid
from pathlib import Path
from datetime import date, timedelta

# Database path
DB_PATH = Path(__file__).parent.parent.parent / "data" / "portal.db"


async def seed():
    """Add comprehensive sample data for Business Updates."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        print("Creating sample accounts...")

        # ============================================
        # 1. Create Accounts
        # ============================================
        accounts = [
            {
                "id": str(uuid.uuid4()),
                "name": "TechCorp Solutions",
                "description": "Tech support and customer service",
                "timezone": "America/New_York",
                "is_active": 1
            },
            {
                "id": str(uuid.uuid4()),
                "name": "GlobalRetail Inc",
                "description": "E-commerce customer support",
                "timezone": "America/Los_Angeles",
                "is_active": 1
            },
            {
                "id": str(uuid.uuid4()),
                "name": "FinanceFirst",
                "description": "Financial services support",
                "timezone": "America/Chicago",
                "is_active": 1
            },
        ]

        for account in accounts:
            await db.execute(
                """
                INSERT INTO bu_accounts (id, name, description, timezone, is_active)
                VALUES (?, ?, ?, ?, ?)
                """,
                (account["id"], account["name"], account["description"],
                 account["timezone"], account["is_active"])
            )

        await db.commit()
        print(f"✓ Created {len(accounts)} accounts")

        # ============================================
        # 2. Get existing team leaders and link to accounts
        # ============================================
        print("Linking team leaders to accounts...")

        cursor = await db.execute(
            "SELECT id, name FROM team_leaders WHERE is_active = 1 LIMIT 5"
        )
        team_leaders = await cursor.fetchall()

        if not team_leaders:
            print("⚠ No team leaders found! Run seed_team_leaders.py first")
            return

        # Link 2-3 team leaders to each account
        account_team_leader_links = []
        for i, account in enumerate(accounts):
            # Each account gets 2-3 team leaders
            tl_count = 2 if i % 2 == 0 else 3
            for j in range(tl_count):
                tl_idx = (i * 2 + j) % len(team_leaders)
                link = {
                    "id": str(uuid.uuid4()),
                    "account_id": account["id"],
                    "team_leader_id": team_leaders[tl_idx]["id"]
                }
                account_team_leader_links.append(link)

                await db.execute(
                    """
                    INSERT OR IGNORE INTO bu_account_team_leaders (id, account_id, team_leader_id)
                    VALUES (?, ?, ?)
                    """,
                    (link["id"], link["account_id"], link["team_leader_id"])
                )

        await db.commit()
        print(f"✓ Created {len(account_team_leader_links)} account-team leader links")

        # ============================================
        # 3. Create Agents under team leaders
        # ============================================
        print("Creating agents...")

        agents = []
        agent_names = [
            "Alice Johnson", "Bob Smith", "Carol Williams", "David Brown",
            "Emma Davis", "Frank Miller", "Grace Wilson", "Henry Moore",
            "Isabel Taylor", "Jack Anderson", "Kate Thomas", "Liam Jackson",
            "Mia White", "Noah Harris", "Olivia Martin", "Paul Thompson",
            "Quinn Garcia", "Rachel Martinez", "Sam Robinson", "Tara Clark"
        ]

        agent_idx = 0
        for tl in team_leaders:
            # Each team leader gets 3-5 agents
            agent_count = 3 + (agent_idx % 3)
            for i in range(agent_count):
                if agent_idx >= len(agent_names):
                    break

                agent = {
                    "id": str(uuid.uuid4()),
                    "name": agent_names[agent_idx],
                    "email": f"{agent_names[agent_idx].lower().replace(' ', '.')}@agents.co",
                    "team_leader_id": tl["id"],
                    "is_active": 1
                }
                agents.append(agent)

                await db.execute(
                    """
                    INSERT INTO bu_agents (id, name, email, team_leader_id, is_active)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (agent["id"], agent["name"], agent["email"],
                     agent["team_leader_id"], agent["is_active"])
                )

                agent_idx += 1

        await db.commit()
        print(f"✓ Created {len(agents)} agents")

        # ============================================
        # 4. Create Metric Definitions per account
        # ============================================
        print("Creating metric definitions...")

        metric_templates = [
            ("Calls Handled", "number", "Total number of calls handled", True, 0),
            ("Average Handle Time", "number", "Average time per call in minutes", True, 1),
            ("Customer Satisfaction", "percentage", "CSAT score", True, 2),
            ("First Call Resolution", "percentage", "FCR rate", True, 3),
            ("Attendance", "boolean", "Present for full shift", True, 4),
            ("Notes", "text", "Additional comments", False, 5),
        ]

        metrics = []
        for account in accounts:
            for metric_name, metric_type, description, is_required, sort_order in metric_templates:
                metric = {
                    "id": str(uuid.uuid4()),
                    "account_id": account["id"],
                    "metric_name": metric_name,
                    "metric_type": metric_type,
                    "description": description,
                    "is_required": 1 if is_required else 0,
                    "sort_order": sort_order
                }
                metrics.append(metric)

                await db.execute(
                    """
                    INSERT INTO bu_metric_definitions (
                        id, account_id, metric_name, metric_type, description,
                        is_required, sort_order, is_active
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                    """,
                    (metric["id"], metric["account_id"], metric["metric_name"],
                     metric["metric_type"], metric["description"],
                     metric["is_required"], metric["sort_order"])
                )

        await db.commit()
        print(f"✓ Created {len(metrics)} metric definitions")

        # ============================================
        # 5. Create Sample Submissions
        # ============================================
        print("Creating sample submissions...")

        # Create submissions for the last 3 days
        today = date.today()
        dates = [
            (today - timedelta(days=2)).isoformat(),
            (today - timedelta(days=1)).isoformat(),
            today.isoformat()
        ]

        submission_count = 0
        for submission_date in dates:
            # Create agent-level submissions (70% of agents submit each day)
            for agent in agents:
                # 70% submission rate
                if (hash(agent["id"] + submission_date) % 10) < 7:
                    # Find the account for this agent's team leader
                    cursor = await db.execute(
                        """
                        SELECT atl.account_id FROM bu_account_team_leaders atl
                        WHERE atl.team_leader_id = ?
                        LIMIT 1
                        """,
                        (agent["team_leader_id"],)
                    )
                    row = await cursor.fetchone()
                    if not row:
                        continue

                    account_id = row["account_id"]

                    # Create submission
                    submission_id = str(uuid.uuid4())
                    await db.execute(
                        """
                        INSERT OR IGNORE INTO bu_daily_submissions (
                            id, account_id, team_leader_id, agent_id,
                            submission_date, submission_level, notes
                        ) VALUES (?, ?, ?, ?, ?, 'agent', ?)
                        """,
                        (submission_id, account_id, agent["team_leader_id"],
                         agent["id"], submission_date, "Daily update submitted")
                    )

                    # Add metric values
                    cursor = await db.execute(
                        """
                        SELECT id, metric_name, metric_type FROM bu_metric_definitions
                        WHERE account_id = ? AND is_active = 1
                        """,
                        (account_id,)
                    )
                    metric_defs = await cursor.fetchall()

                    for metric_def in metric_defs:
                        # Generate random but realistic metric values
                        if metric_def["metric_type"] == "number":
                            if "Calls" in metric_def["metric_name"]:
                                value = str(30 + (hash(submission_id + metric_def["id"]) % 40))
                            else:  # Average Handle Time
                                value = str(5 + (hash(submission_id + metric_def["id"]) % 10))
                        elif metric_def["metric_type"] == "percentage":
                            value = str(75 + (hash(submission_id + metric_def["id"]) % 20))
                        elif metric_def["metric_type"] == "boolean":
                            value = "true" if (hash(submission_id + metric_def["id"]) % 10) < 9 else "false"
                        else:  # text
                            value = "All good" if (hash(submission_id + metric_def["id"]) % 2) == 0 else ""

                        await db.execute(
                            """
                            INSERT INTO bu_submission_metrics (
                                id, submission_id, metric_definition_id, metric_value
                            ) VALUES (?, ?, ?, ?)
                            """,
                            (str(uuid.uuid4()), submission_id, metric_def["id"], value)
                        )

                    submission_count += 1

        await db.commit()
        print(f"✓ Created {submission_count} sample submissions")

        # ============================================
        # Summary
        # ============================================
        print("")
        print("=" * 50)
        print("Business Updates Seed Complete!")
        print("=" * 50)
        print(f"Accounts: {len(accounts)}")
        print(f"Team Leaders linked: {len(set(link['team_leader_id'] for link in account_team_leader_links))}")
        print(f"Agents: {len(agents)}")
        print(f"Metric Definitions: {len(metrics)}")
        print(f"Sample Submissions: {submission_count}")
        print("")
        print("Sample accounts:")
        for account in accounts:
            print(f"  - {account['name']}")


async def main():
    print("Seeding Business Updates tables...")
    print("")
    await seed()
    print("")
    print("Seed complete!")


if __name__ == "__main__":
    asyncio.run(main())
