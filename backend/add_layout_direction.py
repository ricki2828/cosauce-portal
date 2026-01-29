import sqlite3

conn = sqlite3.connect('data/portal.db')
cursor = conn.cursor()

# Check if column already exists
cursor.execute("PRAGMA table_info(team_members)")
columns = [col[1] for col in cursor.fetchall()]

# Add layout_direction column if it doesn't exist
if 'layout_direction' not in columns:
    cursor.execute("ALTER TABLE team_members ADD COLUMN layout_direction TEXT DEFAULT 'horizontal'")
    print("Added 'layout_direction' column")
else:
    print("Column 'layout_direction' already exists")

conn.commit()
conn.close()
