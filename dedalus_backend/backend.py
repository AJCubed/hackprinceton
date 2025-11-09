import asyncio
import sqlite3
import subprocess
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dedalus_labs import AsyncDedalus, DedalusRunner

from dotenv import load_dotenv

import json


load_dotenv()

# FastAPI app setup
app = FastAPI()

# CORS middleware for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Adjust for your Next.js port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SQLite database setup
DB_PATH = "../hp-app/data/conversations.db"




def create_reminder(title: str, due_date: Optional[str] = None) -> str:
    """
    Create a reminder on macOS using AppleScript.
    
    Args:
        title: The reminder text
        due_date: Optional due date in format 'YYYY-MM-DD HH:MM'
    
    Returns:
        Success or error message
    """
    try:
        if due_date:
            # Parse date and create reminder with due date
            applescript = f'''
            tell application "Reminders"
                set mylist to list "Reminders"
                tell mylist
                    make new reminder with properties {{name:"{title}", due date:date "{due_date}"}}
                end tell
            end tell
            '''
        else:
            # Create simple reminder without due date
            applescript = f'''
            tell application "Reminders"
                set mylist to list "Reminders"
                tell mylist
                    make new reminder with properties {{name:"{title}"}}
                end tell
            end tell
            '''
        
        subprocess.run(['osascript', '-e', applescript], check=True, capture_output=True)
        return f"✓ Reminder created: {title}" + (f" (due: {due_date})" if due_date else "")
    except subprocess.CalledProcessError as e:
        return f"✗ Failed to create reminder: {e.stderr.decode()}"
    except Exception as e:
        return f"✗ Error creating reminder: {str(e)}"


def create_calendar_event(
    title: str,
    start_time: str,
    end_time: str,
    notes: Optional[str] = None,
    calendar_name: str = "Calendar",
) -> str:
    """
    Create a calendar event on macOS using JXA (osascript -l JavaScript).

    Args:
        title: Event title
        start_time: 'YYYY-MM-DD HH:MM' (local time)
        end_time:   'YYYY-MM-DD HH:MM' (local time)
        notes: Optional notes/description
        calendar_name: Name of the Calendar (defaults to 'Calendar')

    Returns:
        Success or error message.
    """
    try:
        # 1) Parse/validate times in Python
        fmt = "%Y-%m-%d %H:%M"
        start_dt = datetime.strptime(start_time, fmt)
        end_dt = datetime.strptime(end_time, fmt)
        if end_dt <= start_dt:
            raise ValueError("end_time must be after start_time")

        # 2) ISO-like (no timezone → interpreted as local by JXA Date)
        start_iso = start_dt.strftime("%Y-%m-%dT%H:%M:%S")
        end_iso   = end_dt.strftime("%Y-%m-%dT%H:%M:%S")

        # 3) Safely embed strings for JS
        js_title = json.dumps(title)
        js_notes = "null" if notes is None else json.dumps(notes)
        js_cal   = json.dumps(calendar_name)
        js_start = json.dumps(start_iso)
        js_end   = json.dumps(end_iso)

        # 4) JXA script: create the event
        jxa = f"""
        const app = Application('Calendar');
        const cals = app.calendars;
        const wantedName = {js_cal};

        // Find calendar by name, else fall back to first calendar
        let cal = (function () {{
            const matches = cals.whose({{ name: wantedName }});
            if (matches.length) return matches[0];
            return cals()[0];
        }})();

        const startDate = new Date({js_start});
        const endDate = new Date({js_end});
        if (isNaN(startDate) || isNaN(endDate)) {{
            throw new Error('Invalid date parsing in JXA');
        }}

        // Build event
        const ev = app.Event({{
            summary: {js_title},
            startDate: startDate,
            endDate: endDate
        }});

        if ({js_notes} !== null) ev.description = {js_notes};

        cal.events.push(ev);
        """

        subprocess.run(
            ['osascript', '-l', 'JavaScript', '-e', jxa],
            check=True, capture_output=True, text=True
        )
        return f"✓ Calendar event created: {title} from {start_time} to {end_time}"

    except subprocess.CalledProcessError as e:
        # Surface either stderr or stdout to help debug scripting errors/permissions
        detail = e.stderr.strip() or e.stdout.strip()
        return f"✗ Failed to create calendar event: {detail}"
    except Exception as e:
        return f"✗ Error creating calendar event: {e}"

def execute_sql(query: str) -> str:
    """
    Execute SQL query on local SQLite database.
    Supports SELECT, INSERT, UPDATE, DELETE operations.
    
    Args:
        query: SQL query to execute
    
    Returns:
        Query results or success message
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute(query)
        
        if query.strip().upper().startswith('SELECT'):
            results = cursor.fetchall()
            columns = [description[0] for description in cursor.description]
            
            if not results:
                return "✓ Query executed successfully. No results found."
            
            # Format results as a readable string
            result_str = f"✓ Found {len(results)} result(s):\n"
            for row in results:
                row_dict = dict(zip(columns, row))
                result_str += f"  {row_dict}\n"
            
            conn.close()
            return result_str
        else:
            conn.commit()
            affected_rows = cursor.rowcount
            conn.close()
            return f"✓ Query executed successfully. {affected_rows} row(s) affected."
            
    except sqlite3.Error as e:
        return f"✗ SQL error: {str(e)}"
    except Exception as e:
        return f"✗ Error executing SQL: {str(e)}"


# Request/Response models
class DedalusRequest(BaseModel):
    input: str
    model: str = "openai/gpt-5"


class DedalusResponse(BaseModel):
    status: str  # "success" or "error"
    description: str


# API endpoint
@app.post("/api/dedalus", response_model=DedalusResponse)
async def run_dedalus(request: DedalusRequest):
    """
    Execute Dedalus with local tools and return a summary of actions taken.
    """
    try:
        client = AsyncDedalus()
        runner = DedalusRunner(client)

        

        # Run Dedalus with the user's input
        response = await runner.run(
            input=request.input,
            model=request.model,
            tools = [
                create_reminder,
                create_calendar_event,
                execute_sql
            ]
        )

        # Extract a concise description from the response
        final_output = response.final_output or "Task completed successfully."
        
        return DedalusResponse(
            status="success",
            description=final_output[:500]  # Limit to 500 chars for brevity
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(app, host="0.0.0.0", port=8000)