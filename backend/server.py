from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os
import random
import time
import urllib.error
import urllib.request


ROOT = Path(__file__).resolve().parents[1]
HOST = "127.0.0.1"
PORT = 8000
OPENAI_VISION_MODEL = os.environ.get("OPENAI_VISION_MODEL", "gpt-4.1-mini")

DETECTABLE_OBJECTS = [
    "desk",
    "chair",
    "laptop",
    "phone",
    "coffee mug",
    "water bottle",
    "notebook",
    "keys",
    "backpack",
    "bookshelf",
    "window",
    "door",
    "lamp",
    "plant",
    "trash bin",
]

EXTRA_OBJECTS = ["charger", "remote", "pen", "folder", "headphones", "wallet", "jacket", "box"]

WITNESSES = [
    {
        "type": "Nervous Witness",
        "mood": "Anxious, forgetful, easily pressured",
        "opening": "I already told you everything I remember. The room was quiet, then everything felt wrong.",
        "filler": "I am trying to remember, but the details keep moving around in my head.",
    },
    {
        "type": "Cold Observer",
        "mood": "Precise, detached, difficult to read",
        "opening": "I observed the incident. My account is factual. Emotion will not improve it.",
        "filler": "I can repeat the sequence, but interpretation is your responsibility.",
    },
    {
        "type": "The Rambler",
        "mood": "Talkative, jumpy, accidentally revealing",
        "opening": "It was strange, really strange. I mean, rooms make sounds, but this was different.",
        "filler": "There were so many little things happening at once that I may have mixed some of them up.",
    },
    {
        "type": "Hostile Witness",
        "mood": "Defensive, irritated, evasive",
        "opening": "I do not know why you are treating me like a suspect. Ask your questions and be done.",
        "filler": "You are reading too much into ordinary things.",
    },
    {
        "type": "The Liar",
        "mood": "Confident, charming, manipulative",
        "opening": "I am happy to help. I have nothing to hide, and the facts will show that.",
        "filler": "Careful. A dramatic theory is not the same as evidence.",
    },
]

CASE_PROFILES = [
    {
        "crime": "a fatal fall staged as an accident",
        "motive": "fear of exposure",
        "method": "staged the scene around a false exit",
        "caseNoun": "Contradiction",
        "objective": "Prove whether the witness invented the sealed-room story.",
    },
    {
        "crime": "the theft of a sealed research file",
        "motive": "control of a valuable secret",
        "method": "hid the key clue inside an ordinary container",
        "caseNoun": "File",
        "objective": "Find the object that breaks the witness timeline.",
    },
    {
        "crime": "a disappearance disguised as a voluntary exit",
        "motive": "revenge for an old betrayal",
        "method": "made the victim appear to act alone",
        "caseNoun": "Exit",
        "objective": "Separate a voluntary exit from a staged disappearance.",
    },
    {
        "crime": "a poisoning hidden in plain sight",
        "motive": "a buried debt",
        "method": "used a familiar object to redirect suspicion",
        "caseNoun": "Residue",
        "objective": "Connect the harmless-looking object to the motive.",
    },
    {
        "crime": "a blackmail exchange that turned violent",
        "motive": "professional jealousy",
        "method": "altered the timeline with a device timestamp",
        "caseNoun": "Timestamp",
        "objective": "Use the room's timeline to expose what the witness omitted.",
    },
]


def title_case(value):
    return " ".join(part.capitalize() for part in value.split())


def unique(values):
    seen = set()
    result = []
    for value in values:
        key = str(value).strip().lower()
        if key and key not in seen:
            seen.add(key)
            result.append(key)
    return result


def pick(values, rng):
    return values[rng.randrange(len(values))]


def clue_for_object(obj):
    lower = obj.lower()
    if "window" in lower:
        return {
            "object": obj,
            "title": "Window latch disturbed",
            "detail": "The latch is scraped from the inside, contradicting the witness claim that nobody touched the exit.",
            "contradiction": "The witness said the room stayed sealed, but the window shows recent movement.",
        }
    if "door" in lower:
        return {
            "object": obj,
            "title": "Door mark at handle height",
            "detail": "A faint pressure mark suggests someone paused at the door before staging the scene.",
            "contradiction": "The witness said they never came near the exit after the argument.",
        }
    if any(term in lower for term in ["mug", "cup", "bottle"]):
        return {
            "object": obj,
            "title": "Unmatched drink residue",
            "detail": f"Residue on the {obj} does not match the victim's usual drink, pointing to a deliberate setup.",
            "contradiction": "The witness insisted the victim poured the drink themselves.",
        }
    if any(term in lower for term in ["laptop", "phone"]):
        return {
            "object": obj,
            "title": "Timestamp gap discovered",
            "detail": f"The {obj} shows activity during the exact minute the witness claimed the room was empty.",
            "contradiction": "The witness timeline leaves out a device interaction.",
        }
    if any(term in lower for term in ["backpack", "bag"]):
        return {
            "object": obj,
            "title": "Hidden transfer pocket",
            "detail": f"A pocket inside the {obj} contains a torn label connected to the missing file.",
            "contradiction": "The witness said the bag had not been opened all evening.",
        }
    if any(term in lower for term in ["book", "shelf", "notebook"]):
        return {
            "object": obj,
            "title": "Moved reference item",
            "detail": f"Dust around the {obj} shows it was moved recently and then returned in a hurry.",
            "contradiction": "The witness described the shelves as untouched.",
        }
    return {
        "object": obj,
        "title": f"{title_case(obj)} trace",
        "detail": f"The {obj} carries a small inconsistency that connects it to the final minutes before the incident.",
        "contradiction": f"The witness did not mention the {obj}, even though it changes the timeline.",
    }


def procedural_detect_objects(payload):
    signature = payload.get("signature") or {}
    brightness = float(signature.get("brightness") or 100)
    contrast = float(signature.get("contrast") or 40)
    warm = float(signature.get("warm") or 0)
    cool = float(signature.get("cool") or 0)
    seed = int(brightness * 17 + contrast * 31 + warm * 7 + cool * 11 + time.time())
    rng = random.Random(seed)
    detected = [
        "desk",
        "chair",
        "window" if brightness > 125 else "lamp",
        "laptop" if cool >= warm else "coffee mug",
        "backpack" if contrast > 55 else "notebook",
        pick(DETECTABLE_OBJECTS, rng),
        pick(DETECTABLE_OBJECTS, rng),
        pick(EXTRA_OBJECTS, rng),
    ]
    return unique(detected)[:10]


def extract_response_text(response):
    if response.get("output_text"):
        return response["output_text"]
    chunks = []
    for item in response.get("output", []):
        for content in item.get("content", []):
            if content.get("type") in ["output_text", "text"] and content.get("text"):
                chunks.append(content["text"])
    return "\n".join(chunks).strip()


def parse_json_text(text):
    if not text:
        return {}
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`").strip()
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start >= 0 and end >= start:
        cleaned = cleaned[start:end + 1]
    return json.loads(cleaned)


def normalize_detected_objects(values):
    objects = []
    for value in values or []:
        label = str(value).strip().lower()
        label = "".join(char for char in label if char.isalnum() or char in [" ", "-"])
        label = " ".join(label.replace("-", " ").split())
        if 2 <= len(label) <= 32:
            objects.append(label)
    return unique(objects)[:12]


def openai_detect_objects(payload):
    api_key = os.environ.get("OPENAI_API_KEY")
    image_data_url = payload.get("imageDataUrl")
    if not api_key or not image_data_url or not image_data_url.startswith("data:image/"):
        return None

    prompt = (
        "You are TRACE's room scanner. Analyze the room photo and return only strict JSON with "
        "this shape: {\"objects\":[\"object name\"],\"sceneSummary\":\"short room summary\","
        "\"clueCandidates\":[\"object name\"]}. List 5 to 12 visible physical room objects. "
        "Use common nouns, avoid brand names, do not identify people or faces, and prefer objects "
        "that could become mystery evidence."
    )
    request_body = {
        "model": OPENAI_VISION_MODEL,
        "input": [
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": prompt},
                    {"type": "input_image", "image_url": image_data_url, "detail": "low"},
                ],
            }
        ],
    }
    request = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(request_body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=25) as response:
        data = json.loads(response.read().decode("utf-8"))

    parsed = parse_json_text(extract_response_text(data))
    objects = normalize_detected_objects(parsed.get("objects"))
    if len(objects) < 3:
        return None
    return {
        "objects": objects,
        "source": "openai",
        "sceneSummary": str(parsed.get("sceneSummary") or "").strip()[:240],
        "clueCandidates": normalize_detected_objects(parsed.get("clueCandidates"))[:5],
        "model": OPENAI_VISION_MODEL,
    }


def detect_scan(payload):
    try:
        vision_result = openai_detect_objects(payload)
        if vision_result:
            return vision_result
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError, OSError, ValueError):
        pass
    return {
        "objects": procedural_detect_objects(payload),
        "source": "demo",
        "sceneSummary": "",
        "clueCandidates": [],
        "model": "",
    }


def create_case(payload):
    inventory = unique(payload.get("inventory") or [])
    player_name = (payload.get("playerName") or "Investigator").strip()
    if len(inventory) < 3:
        raise ValueError("At least three scanned objects are required.")

    seed = hash("|".join(inventory) + player_name + str(time.time()))
    rng = random.Random(seed)
    victim = pick(["Mara Vale", "Jonah Reed", "Eleni Cross", "Tomi Adebayo", "Nadia Stone"], rng)
    witness_name = pick(["Iris Cole", "Victor Hale", "Sera Quinn", "Malik Rowe", "Daphne Knox"], rng)
    secondary = pick(["a former collaborator", "the building manager", "a visiting investor", "an unknown intruder"], rng)
    witness = pick(WITNESSES, rng)
    profile = pick(CASE_PROFILES, rng)
    key_object = next((obj for obj in inventory if obj in ["window", "door", "coffee mug", "laptop", "phone", "backpack"]), inventory[0])
    hidden_object = next((obj for obj in inventory if obj in ["backpack", "bookshelf", "notebook", "desk", "chair"]), inventory[-1])
    case_name = f"The {title_case(key_object)} {profile['caseNoun']}"
    briefing = (
        f"{victim} became the center of a room-born mystery. {witness_name} gives a clean story, "
        f"but the {key_object} and {hidden_object} suggest the room remembers more than the witness admits."
    )

    return {
        "caseName": case_name,
        "victim": victim,
        "crime": profile["crime"],
        "motive": profile["motive"],
        "method": profile["method"],
        "briefing": briefing,
        "objective": profile["objective"],
        "witnessName": witness_name,
        "witnessType": witness["type"],
        "witnessMood": witness["mood"],
        "witnessOpening": witness["opening"],
        "witnessFiller": witness["filler"],
        "culprit": witness_name,
        "secondarySuspect": secondary,
        "keyObject": key_object,
        "hiddenObject": hidden_object,
        "groundTruth": (
            f"{witness_name} confronted {victim} over {profile['motive']}. They {profile['method']}, "
            f"using the {key_object} to redirect suspicion while the decisive trace remained near the {hidden_object}."
        ),
        "lie": f"The witness claims the room was undisturbed and that {victim} was alone before the incident.",
        "evidence": [clue_for_object(obj) for obj in inventory],
        "timeline": [
            {"time": "20:14", "text": f"{victim} enters the room and notices the {key_object}."},
            {"time": "20:19", "text": f"{secondary} is mentioned but never clearly placed in the room."},
            {"time": "20:23", "text": f"{witness_name} confronts {victim} over {profile['motive']}."},
            {"time": "20:27", "text": f"The {key_object} becomes part of the staged explanation."},
            {"time": "20:31", "text": f"The decisive trace is left near the {hidden_object}."},
            {"time": "20:36", "text": f"{witness_name} gives a confident but incomplete statement to {player_name}."},
        ],
    }


class TraceHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_POST(self):
        try:
            payload = self.read_json()
            if self.path == "/api/scan":
                self.send_json(detect_scan(payload))
            elif self.path == "/api/case":
                self.send_json({"caseData": create_case(payload)})
            else:
                self.send_error(404, "Unknown endpoint")
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=400)

    def read_json(self):
        length = int(self.headers.get("Content-Length") or 0)
        if not length:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw)

    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    server = ThreadingHTTPServer((HOST, PORT), TraceHandler)
    print(f"TRACE backend running at http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
