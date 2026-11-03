"""Back up, verify, and restore SQLite without copying a live database file."""

import argparse
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
import sqlite3
from data.nutrition_data_store import DEFAULT_DB_PATH


def verify(path):
    path = Path(path).resolve()
    if not path.is_file():
        raise ValueError("Database file does not exist.")
    with closing(sqlite3.connect(path.as_uri() + "?mode=ro", uri=True)) as conn:
        if conn.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise ValueError("SQLite integrity check failed.")
        if conn.execute("PRAGMA foreign_key_check").fetchall():
            raise ValueError("Database contains foreign-key violations.")
        if not conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
        ).fetchone():
            raise ValueError("This is not a NutriAI database.")
    return True


def backup(database, output):
    source = Path(database).resolve()
    destination = Path(output).resolve()
    if source == destination or destination.exists():
        raise ValueError(
            "Choose a new backup path; existing files are never overwritten."
        )
    verify(source)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with closing(sqlite3.connect(source.as_uri() + "?mode=ro", uri=True)) as src:
        with closing(sqlite3.connect(destination)) as dest:
            src.backup(dest)
    verify(destination)
    return str(destination)


def restore(source, database, replace=False):
    source = Path(source).resolve()
    target = Path(database).resolve()
    if source == target:
        raise ValueError("Source and target must be different files.")
    verify(source)
    if target.exists():
        if not replace:
            raise ValueError(
                "Target already exists. Use --replace after stopping the server."
            )
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        backup(target, target.with_name(target.name + ".before-restore-" + stamp))
    target.parent.mkdir(parents=True, exist_ok=True)
    with closing(sqlite3.connect(source.as_uri() + "?mode=ro", uri=True)) as src:
        with closing(sqlite3.connect(target)) as dest:
            src.backup(dest)
    verify(target)
    return str(target)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    b = commands.add_parser("backup")
    b.add_argument("--database", default=DEFAULT_DB_PATH)
    b.add_argument("--output", required=True)
    v = commands.add_parser("verify")
    v.add_argument("database")
    r = commands.add_parser("restore")
    r.add_argument("--backup", required=True)
    r.add_argument("--database", required=True)
    r.add_argument("--replace", action="store_true")
    args = parser.parse_args()
    if args.command == "backup":
        print(backup(args.database, args.output))
    elif args.command == "verify":
        verify(args.database)
        print("Integrity and foreign keys: OK")
    else:
        print(restore(args.backup, args.database, args.replace))


if __name__ == "__main__":
    main()
