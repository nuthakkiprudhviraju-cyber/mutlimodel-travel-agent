"""
Travel Intake Agent powered by Google Gemini with deterministic regex fallback.
Parses natural language prompts to extract structured travel parameters:
origin, destination, departure date, arrival deadline, budget, transport mode,
and seating preference.
"""
import os
import re
import json
import time
from datetime import datetime, date, timedelta
from typing import Dict, Any, Optional
from app.schemas.schemas import TripConstraints
from app.core.config import settings

class TravelIntakeAgent:
    @staticmethod
    def parse_request(prompt: str, language: str = "en") -> TripConstraints:
        """
        Extract structured travel parameters using Google Gemini 3.8 Flash with retry.
        Falls back seamlessly to deterministic parsing if API is temporarily unavailable or times out.
        """
        api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if api_key:
            # Retry up to 2 times on transient 503 capacity spikes
            for attempt in range(2):
                try:
                    from google import genai
                    client = genai.Client(api_key=api_key)
                    system_instruction = (
                        "You are an expert travel concierge parser. "
                        "Extract structured parameters from the user's travel request into a clean JSON object with keys: "
                        "origin (string), destination (string), departure_date (YYYY-MM-DD or null), "
                        "arrival_deadline (HH:MM 24-hour format or null), max_budget (float or null), "
                        "passenger_count (integer, default 1), seating_preference (SLEEPER, SEATER, or ANY), "
                        "preferred_modes (list from BUS, TRAIN, CAB, FLIGHT). "
                        "Extract the exact origin city/state and destination city/state from the prompt. "
                        "Return ONLY valid raw JSON without markdown or backticks."
                    )
                    response = client.models.generate_content(
                        model="gemini-3.8-flash",
                        contents=f"Extract travel parameters from this request: '{prompt}'",
                        config={"system_instruction": system_instruction}
                    )
                    text = response.text.strip()
                    if text.startswith("```"):
                        text = re.sub(r"^```(?:json)?\s*", "", text)
                        text = re.sub(r"\s*```$", "", text)
                    data = json.loads(text)

                    origin = (data.get("origin") or "").strip().title() or "Karnataka"
                    destination = (data.get("destination") or "").strip().title() or "Hyderabad"
                    dep_date = data.get("departure_date") or (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")

                    # Normalize arrival deadline to HH:MM
                    deadline = data.get("arrival_deadline")
                    if deadline:
                        match = re.search(r'(\d{1,2})(?::(\d{2}))?\s*(am|pm)?', deadline.lower())
                        if match:
                            hr = int(match.group(1))
                            mn = int(match.group(2)) if match.group(2) else 0
                            meridiem = match.group(3)
                            if meridiem == "pm" and hr < 12:
                                hr += 12
                            elif meridiem == "am" and hr == 12:
                                hr = 0
                            deadline = f"{hr:02d}:{mn:02d}"
                        else:
                            deadline = "09:00"
                    else:
                        deadline = "09:00"

                    # Normalize modes
                    modes = []
                    for m in (data.get("preferred_modes") or []):
                        mu = str(m).upper()
                        if "BUS" in mu: modes.append("BUS")
                        elif "TRAIN" in mu: modes.append("TRAIN")
                        elif "CAB" in mu or "CAR" in mu: modes.append("CAB")
                    if not modes:
                        modes = ["BUS", "TRAIN", "CAB"]

                    seating = str(data.get("seating_preference", "SLEEPER")).upper()
                    if "SLEEP" in seating:
                        seating = "SLEEPER"
                    elif "SEAT" in seating:
                        seating = "SEATER"
                    else:
                        seating = "ANY"

                    return TripConstraints(
                        origin=origin,
                        destination=destination,
                        departure_date=dep_date,
                        arrival_deadline=deadline,
                        max_budget=float(data["max_budget"]) if data.get("max_budget") else 1500.0,
                        passenger_count=int(data.get("passenger_count") or 1),
                        seating_preference=seating,
                        preferred_modes=modes,
                        selected_places=[],
                        luggage_needed=True,
                        accessibility_needs=False,
                        notes=f"Intelligently parsed via Gemini"
                    )
                except Exception as e:
                    print(f"Gemini attempt {attempt+1} encountered: {e}")
                    if attempt == 0:
                        time.sleep(1)
                        continue
                    print("Falling back to deterministic parser.")

        return TravelIntakeAgent._deterministic_parse(prompt)

    @staticmethod
    def _deterministic_parse(prompt: str) -> TripConstraints:
        text = prompt.strip()

        origin = "Karnataka"
        destination = "Hyderabad"

        # Explicit regex: "from <origin> to <destination>"
        route_match = re.search(
            r'\bfrom\s+([A-Za-z\s]+?)\s+to\s+([A-Za-z\s]+?)(?:\s+(?:on|reach|before|visit|at|by|with|in)|[\.,\n]|$)',
            text,
            re.IGNORECASE
        )
        if route_match:
            cand_origin = route_match.group(1).strip()
            cand_dest = route_match.group(2).strip()
            if cand_origin:
                origin = cand_origin.title()
            if cand_dest:
                destination = cand_dest.title()

        budget = None
        budget_match = re.search(r'(?:under|below|budget(?:\s+of)?|max(?:\s+budget)?|₹|rs\.?)\s*(?:₹|rs\.?)?\s*(\d{3,5})', text, re.IGNORECASE)
        if budget_match:
            try:
                budget = float(budget_match.group(1))
            except ValueError:
                pass

        arrival_deadline = "09:00"
        deadline_match = re.search(r'(?:before|by|reach\s+at|reach\s+before)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?', text, re.IGNORECASE)
        if deadline_match:
            hr = int(deadline_match.group(1))
            mn = int(deadline_match.group(2)) if deadline_match.group(2) else 0
            meridiem = deadline_match.group(3)
            if meridiem:
                if meridiem.lower() == "pm" and hr < 12:
                    hr += 12
                elif meridiem.lower() == "am" and hr == 12:
                    hr = 0
            arrival_deadline = f"{hr:02d}:{mn:02d}"

        lower_text = text.lower()
        seating_pref = "SLEEPER" if "sleeper" in lower_text else ("SEATER" if "seater" in lower_text else "ANY")

        preferred_modes = []
        if "train" in lower_text or "railway" in lower_text:
            preferred_modes.append("TRAIN")
        if "bus" in lower_text:
            preferred_modes.append("BUS")
        if "cab" in lower_text or "taxi" in lower_text:
            preferred_modes.append("CAB")
        if not preferred_modes:
            preferred_modes = ["BUS", "TRAIN", "CAB"]

        departure_date = (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")

        passenger_count = 1
        passenger_match = re.search(r'(\d+)\s*(?:passengers|people|persons|travellers|tickets)', lower_text)
        if passenger_match:
            passenger_count = int(passenger_match.group(1))

        return TripConstraints(
            origin=origin,
            destination=destination,
            departure_date=departure_date,
            arrival_deadline=arrival_deadline,
            max_budget=budget or 1500.0,
            passenger_count=passenger_count,
            seating_preference=seating_pref,
            preferred_modes=preferred_modes,
            selected_places=[],
            luggage_needed=True,
            accessibility_needs=False,
            notes=f"Parsed from prompt"
        )
