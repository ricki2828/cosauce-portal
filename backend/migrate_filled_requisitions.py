#!/usr/bin/env python3
"""
Migrate filled requisitions to team members with onboarding checklists.
This script creates team member records and checklists for filled requisitions.
"""

import sqlite3
import uuid
import json
from datetime import datetime

def migrate_filled_requisitions():
    conn = sqlite3.connect('data/portal.db')
    cursor = conn.cursor()

    # Get the default checklist template
    cursor.execute("SELECT id, item_name, order_index, stages_json FROM default_onboarding_checklist ORDER BY order_index")
    default_template = cursor.fetchall()

    print(f"Found {len(default_template)} default checklist items")

    # Find filled requisitions without team member records
    cursor.execute("""
        SELECT r.id, r.title, r.department, r.target_start_date, r.headcount
        FROM requisitions r
        WHERE r.status = 'filled'
        AND NOT EXISTS (
            SELECT 1 FROM team_members tm WHERE tm.name = r.title
        )
    """)

    filled_requisitions = cursor.fetchall()

    if not filled_requisitions:
        print("No filled requisitions to migrate")
        conn.close()
        return

    print(f"\nFound {len(filled_requisitions)} filled requisitions to migrate:")
    for req in filled_requisitions:
        print(f"  - {req[1]} ({req[2]})")

    # Migrate each filled requisition
    for req_id, title, department, target_start_date, headcount in filled_requisitions:
        print(f"\nMigrating: {title}")

        # Create team member record
        team_member_id = str(uuid.uuid4())
        now = datetime.now().isoformat()

        cursor.execute("""
            INSERT INTO team_members (id, name, role, department, start_date, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            team_member_id,
            title,
            'Service Agent',  # Default role
            department,
            target_start_date or now,
            'pending',
            now,
            now
        ))

        print(f"  Created team member with ID: {team_member_id}")

        # Create checklist items from template
        for template_id, item_name, order_index, stages_json in default_template:
            # Create checklist item
            item_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO onboarding_checklist_items (id, team_member_id, item_name, order_index, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (item_id, team_member_id, item_name, order_index, now))

            # Create stages for this item
            stages = json.loads(stages_json)
            for stage_idx, stage in enumerate(stages):
                stage_id = str(uuid.uuid4())
                cursor.execute("""
                    INSERT INTO onboarding_checklist_stages (
                        id, checklist_item_id, stage_label, stage_category,
                        stage_order, is_completed
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    stage_id,
                    item_id,
                    stage['label'],
                    stage.get('category'),
                    stage_idx,
                    0  # False = 0 for SQLite boolean
                ))

        print(f"  Created {len(default_template)} checklist items with stages")

    # Commit changes
    conn.commit()
    print(f"\n✓ Successfully migrated {len(filled_requisitions)} filled requisitions")

    # Verify the migration
    print("\n=== Verification ===")
    for req_id, title, _, _, _ in filled_requisitions:
        cursor.execute("""
            SELECT tm.id, COUNT(ci.id) as checklist_count
            FROM team_members tm
            LEFT JOIN onboarding_checklist_items ci ON ci.team_member_id = tm.id
            WHERE tm.name = ?
            GROUP BY tm.id
        """, (title,))
        result = cursor.fetchone()
        if result:
            print(f"{title}: team_member_id={result[0]}, checklist_items={result[1]}")

    conn.close()

if __name__ == "__main__":
    migrate_filled_requisitions()
