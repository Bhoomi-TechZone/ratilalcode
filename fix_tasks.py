#!/usr/bin/env python3
"""
Script to fix missing required fields in existing tasks
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import tasks_collection
from datetime import datetime

def fix_tasks():
    # Get tasks collection
    tasks_coll = tasks_collection()
    print('Updating existing tasks with missing required fields...')

    # Find all tasks missing required fields
    tasks = list(tasks_coll.find({}))
    print(f'Found {len(tasks)} tasks in database')

    updated_count = 0
    for task in tasks:
        update_fields = {}
        
        # Check and add missing assigned_at
        if 'assigned_at' not in task or task['assigned_at'] is None:
            update_fields['assigned_at'] = 'General Site'
        
        # Check and add missing assigned_by  
        if 'assigned_by' not in task or task['assigned_by'] is None:
            update_fields['assigned_by'] = 'System Admin'
            
        # Update if needed
        if update_fields:
            update_fields['updated_at'] = datetime.now()
            result = tasks_coll.update_one(
                {'_id': task['_id']}, 
                {'$set': update_fields}
            )
            if result.modified_count > 0:
                updated_count += 1
                task_id = task.get('id', str(task.get('_id')))
                print(f'Updated task {task_id}: {list(update_fields.keys())}')

    print(f'Successfully updated {updated_count} tasks')

if __name__ == '__main__':
    fix_tasks()