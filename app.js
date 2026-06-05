        const DEFAULT_OBJECTS = [];
        const DETECTABLE_OBJECTS = ["desk", "chair", "laptop", "phone", "coffee mug", "water bottle", "notebook", "keys", "backpack", "bookshelf", "window", "door", "lamp", "plant", "trash bin"];
        const EXTRA_OBJECTS = ["charger", "remote", "pen", "folder", "headphones", "wallet", "jacket", "box"];
        const API_BASE = "";
        const WITNESS_TYPES = [
            {
                type: "Nervous Witness",
                mood: "Anxious, forgetful, easily pressured",
                opening: "I already told you everything I remember. The room was quiet, then everything felt wrong.",
                filler: "I am trying to remember, but the details keep moving around in my head."
            },
            {
                type: "Cold Observer",
                mood: "Precise, detached, difficult to read",
                opening: "I observed the incident. My account is factual. Emotion will not improve it.",
                filler: "I can repeat the sequence, but interpretation is your responsibility."
            },
            {
                type: "The Rambler",
                mood: "Talkative, jumpy, accidentally revealing",
                opening: "It was strange, really strange. I mean, rooms make sounds, but this was different.",
                filler: "There were so many little things happening at once that I may have mixed some of them up."
            },
            {
                type: "Hostile Witness",
                mood: "Defensive, irritated, evasive",
                opening: "I do not know why you are treating me like a suspect. Ask your questions and be done.",
                filler: "You are reading too much into ordinary things."
            },
            {
                type: "The Liar",
                mood: "Confident, charming, manipulative",
                opening: "I am happy to help. I have nothing to hide, and the facts will show that.",
                filler: "Careful. A dramatic theory is not the same as evidence."
            }
        ];

        const state = {
            inventory: [...DEFAULT_OBJECTS],
            playerName: "",
            scanned: false,
            caseData: null,
            foundEvidence: [],
            contradictions: [],
            questions: [],
            events: [],
            accusation: null,
            verdict: null,
            imageUrl: "",
            stream: null,
            scanSource: "No camera scan yet",
            scanTime: null,
            currentStep: "scan"
        };

        const els = {
            landingPage: document.getElementById("landingPage"),
            playerNameInput: document.getElementById("playerNameInput"),
            playerStatus: document.getElementById("playerStatus"),
            sceneFrame: document.getElementById("sceneFrame"),
            sceneMap: document.getElementById("sceneMap"),
            camera: document.getElementById("camera"),
            previewImage: document.getElementById("previewImage"),
            scanStatus: document.getElementById("scanStatus"),
            scanNote: document.getElementById("scanNote"),
            cameraPrompt: document.getElementById("cameraPrompt"),
            cameraPromptTitle: document.getElementById("cameraPromptTitle"),
            cameraPromptBody: document.getElementById("cameraPromptBody"),
            cameraToggle: document.getElementById("cameraToggle"),
            cameraToggleText: document.getElementById("cameraToggleText"),
            inventoryChips: document.getElementById("inventoryChips"),
            objectInput: document.getElementById("objectInput"),
            objectCount: document.getElementById("objectCount"),
            evidenceCount: document.getElementById("evidenceCount"),
            contradictionCount: document.getElementById("contradictionCount"),
            caseName: document.getElementById("caseName"),
            caseBadge: document.getElementById("caseBadge"),
            victimFact: document.getElementById("victimFact"),
            crimeFact: document.getElementById("crimeFact"),
            witnessFact: document.getElementById("witnessFact"),
            motiveFact: document.getElementById("motiveFact"),
            caseBrief: document.getElementById("caseBrief"),
            objectList: document.getElementById("objectList"),
            timelineList: document.getElementById("timelineList"),
            chatLog: document.getElementById("chatLog"),
            chatInput: document.getElementById("chatInput"),
            evidenceList: document.getElementById("evidenceList"),
            witnessMood: document.getElementById("witnessMood"),
            suspectInput: document.getElementById("suspectInput"),
            motiveInput: document.getElementById("motiveInput"),
            methodInput: document.getElementById("methodInput"),
            evidenceInput: document.getElementById("evidenceInput"),
            revealBox: document.getElementById("revealBox"),
            caseFile: document.getElementById("caseFile"),
            toast: document.getElementById("toast")
        };

        async function postJson(path, payload) {
            const response = await fetch(`${API_BASE}${path}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const errorPayload = await response.json().catch(() => ({}));
                throw new Error(errorPayload.error || `Request failed: ${response.status}`);
            }
            return response.json();
        }

        async function postJsonOptional(path, payload) {
            try {
                return await postJson(path, payload);
            } catch (error) {
                return null;
            }
        }

        function titleCase(value) {
            return value.replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
        }

        function escapeHtml(value) {
            return String(value)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
        }

        function unique(list) {
            return [...new Set(list.map(item => item.trim().toLowerCase()).filter(Boolean))];
        }

        function hashText(text) {
            let hash = 0;
            for (let i = 0; i < text.length; i++) {
                hash = ((hash << 5) - hash) + text.charCodeAt(i);
                hash |= 0;
            }
            return Math.abs(hash);
        }

        function pick(list, seed, offset = 0) {
            return list[(seed + offset) % list.length];
        }

        function findObject(names) {
            return names.find(name => state.inventory.includes(name)) || pick(state.inventory, hashText(state.inventory.join(",")));
        }

        function showToast(message) {
            els.toast.textContent = message;
            els.toast.classList.add("active");
            window.clearTimeout(showToast.timer);
            showToast.timer = window.setTimeout(() => els.toast.classList.remove("active"), 2200);
        }

        function setCameraPrompt(status, title, body) {
            els.cameraPrompt.className = `camera-prompt ${status || ""}`.trim();
            els.cameraPromptTitle.textContent = title;
            els.cameraPromptBody.textContent = body;
        }

        function syncCameraToggle(enabled, label) {
            els.cameraToggle.checked = enabled;
            els.cameraToggle.disabled = false;
            els.cameraToggleText.textContent = label || (enabled ? "On and ready to scan" : "Off until you turn it on");
        }

        function openApp(updateHash = true) {
            document.body.classList.add("app-mode");
            if (updateHash && window.location.hash !== "#app") {
                history.pushState(null, "", "#app");
            }
            window.scrollTo({ top: 0, behavior: "smooth" });
        }

        function openLanding(updateHash = true) {
            document.body.classList.remove("app-mode");
            if (updateHash) {
                history.pushState(null, "", window.location.pathname + window.location.search);
            }
            window.scrollTo({ top: 0, behavior: "smooth" });
        }

        function setStep(step) {
            state.currentStep = step;
            document.querySelectorAll(".step").forEach(node => {
                node.classList.toggle("active", node.dataset.step === step);
            });
        }

        function renderSceneMap() {
            els.sceneMap.innerHTML = "";
            els.sceneMap.classList.toggle("scan-results", Boolean(state.inventory.length));
            if (!state.inventory.length) {
                const placeholder = document.createElement("div");
                placeholder.className = "scene-placeholder";
                placeholder.textContent = "No room scanned yet. Enter your investigator name and start a camera scan to reveal evidence objects.";
                els.sceneMap.appendChild(placeholder);
                return;
            }
            const visible = state.inventory.slice(0, 9);
            visible.forEach(object => {
                const tile = document.createElement("div");
                tile.className = "room-object";
                tile.textContent = titleCase(object);
                els.sceneMap.appendChild(tile);
            });
        }

        function renderInventory() {
            els.inventoryChips.innerHTML = "";
            if (!state.inventory.length) {
                const chip = document.createElement("span");
                chip.className = "chip";
                chip.textContent = "No detected objects yet";
                els.inventoryChips.appendChild(chip);
                els.objectCount.textContent = "0";
                renderSceneMap();
                return;
            }
            state.inventory.forEach(object => {
                const chip = document.createElement("span");
                chip.className = "chip";
                chip.textContent = titleCase(object);
                const remove = document.createElement("button");
                remove.type = "button";
                remove.textContent = "x";
                remove.setAttribute("aria-label", `Remove ${object}`);
                remove.addEventListener("click", () => {
                    state.inventory = state.inventory.filter(item => item !== object);
                    renderAll();
                });
                chip.appendChild(remove);
                els.inventoryChips.appendChild(chip);
            });
            els.objectCount.textContent = state.inventory.length;
            renderSceneMap();
        }

        function clueForObject(object, caseData) {
            const lower = object.toLowerCase();
            if (lower.includes("window")) {
                return {
                    object,
                    title: "Window latch disturbed",
                    detail: "The latch is scraped from the inside, contradicting the witness claim that nobody touched the exit.",
                    contradiction: "The witness said the room stayed sealed, but the window shows recent movement."
                };
            }
            if (lower.includes("door")) {
                return {
                    object,
                    title: "Door mark at handle height",
                    detail: "A faint pressure mark suggests someone paused at the door before staging the scene.",
                    contradiction: "The witness said they never came near the exit after the argument."
                };
            }
            if (lower.includes("mug") || lower.includes("cup") || lower.includes("bottle")) {
                return {
                    object,
                    title: "Unmatched drink residue",
                    detail: `Residue on the ${object} does not match the victim's usual drink, pointing to a deliberate setup.`,
                    contradiction: "The witness insisted the victim poured the drink themselves."
                };
            }
            if (lower.includes("laptop") || lower.includes("phone")) {
                return {
                    object,
                    title: "Timestamp gap discovered",
                    detail: `The ${object} shows activity during the exact minute the witness claimed the room was empty.`,
                    contradiction: "The witness timeline leaves out a device interaction."
                };
            }
            if (lower.includes("backpack") || lower.includes("bag")) {
                return {
                    object,
                    title: "Hidden transfer pocket",
                    detail: `A pocket inside the ${object} contains a torn label connected to the missing file.`,
                    contradiction: "The witness said the bag had not been opened all evening."
                };
            }
            if (lower.includes("book") || lower.includes("shelf") || lower.includes("notebook")) {
                return {
                    object,
                    title: "Moved reference item",
                    detail: `Dust around the ${object} shows it was moved recently and then returned in a hurry.`,
                    contradiction: "The witness described the shelves as untouched."
                };
            }
            if (lower.includes("chair") || lower.includes("desk")) {
                return {
                    object,
                    title: "Staged furniture angle",
                    detail: `The ${object} angle does not match the witness's version of where everyone stood.`,
                    contradiction: "The witness placed themselves across the room, but the furniture points to a closer confrontation."
                };
            }
            return {
                object,
                title: `${titleCase(object)} trace`,
                detail: `The ${object} carries a small inconsistency that connects it to the final minutes before the incident.`,
                contradiction: `The witness did not mention the ${object}, even though it changes the timeline.`
            };
        }

        async function generateCase() {
            if (!state.scanned) {
                showToast("Scan your room with the camera before generating a case.");
                els.scanNote.textContent = "The mystery engine needs a camera scan before it can build a case.";
                return;
            }
            if (state.inventory.length < 3) {
                showToast("Trace needs at least three detected objects before generating a case.");
                return;
            }

            const backendCase = await postJsonOptional("/api/case", {
                playerName: state.playerName,
                inventory: state.inventory,
                scanSource: state.scanSource
            });
            if (backendCase && backendCase.caseData) {
                state.caseData = backendCase.caseData;
                state.foundEvidence = [];
                state.contradictions = [];
                state.questions = [];
                state.events = [{ time: "Now", text: `Case generated from ${state.scanSource.toLowerCase()}.` }];
                state.accusation = null;
                state.verdict = null;
                state.scanned = true;
                els.chatLog.innerHTML = "";
                els.revealBox.classList.remove("active");
                els.revealBox.innerHTML = "";
                els.caseFile.textContent = "Investigate the case, submit an accusation, then generate the final report.";
                els.motiveInput.value = "";
                els.methodInput.value = "";
                els.evidenceInput.value = "";
                setStep("case");
                renderAll();
                addMessage("system", "Trace", `Case assigned to Investigator ${state.playerName}. Follow the room evidence before making an accusation.`);
                addMessage("witness", state.caseData.witnessName, state.caseData.witnessOpening);
                showToast("Mystery generated by backend.");
                return;
            }

            const seed = hashText(state.inventory.join("|") + state.scanSource + Date.now().toString().slice(-4));
            const witness = pick(WITNESS_TYPES, seed);
            const victims = ["Mara Vale", "Jonah Reed", "Eleni Cross", "Tomi Adebayo", "Nadia Stone"];
            const witnesses = ["Iris Cole", "Victor Hale", "Sera Quinn", "Malik Rowe", "Daphne Knox"];
            const secondarySuspects = ["a former collaborator", "the building manager", "a visiting investor", "an unknown intruder", "the victim's assistant"];
            const caseProfiles = [
                {
                    crime: "a fatal fall staged as an accident",
                    motive: "fear of exposure",
                    method: "staged the scene around a false exit",
                    caseNoun: "Contradiction",
                    briefing: (victim, witnessName, keyObject, hiddenObject) => `${victim} was found after what looked like an accident. ${witnessName} claims the room stayed sealed, but the ${keyObject} and ${hiddenObject} do not agree with that story.`,
                    objective: "Prove whether the witness invented the sealed-room story."
                },
                {
                    crime: "the theft of a sealed research file",
                    motive: "control of a valuable secret",
                    method: "hid the key clue inside an ordinary container",
                    caseNoun: "File",
                    briefing: (victim, witnessName, keyObject, hiddenObject) => `${victim}'s protected file vanished minutes before the scan. ${witnessName} gives a clean timeline, but the ${hiddenObject} points to a hidden transfer.`,
                    objective: "Find the object that breaks the witness timeline."
                },
                {
                    crime: "a disappearance disguised as a voluntary exit",
                    motive: "revenge for an old betrayal",
                    method: "made the victim appear to act alone",
                    caseNoun: "Exit",
                    briefing: (victim, witnessName, keyObject, hiddenObject) => `${victim} supposedly left alone. The room tells a different story: the ${keyObject} suggests staging, while the ${hiddenObject} holds the overlooked clue.`,
                    objective: "Separate a voluntary exit from a staged disappearance."
                },
                {
                    crime: "a poisoning hidden in plain sight",
                    motive: "a buried debt",
                    method: "used a familiar object to redirect suspicion",
                    caseNoun: "Residue",
                    briefing: (victim, witnessName, keyObject, hiddenObject) => `${victim} collapsed after a routine visit. ${witnessName} insists nothing unusual was touched, but the ${keyObject} makes that hard to believe.`,
                    objective: "Connect the harmless-looking object to the motive."
                },
                {
                    crime: "a blackmail exchange that turned violent",
                    motive: "professional jealousy",
                    method: "altered the timeline with a device timestamp",
                    caseNoun: "Timestamp",
                    briefing: (victim, witnessName, keyObject, hiddenObject) => `${victim} came to trade information, not start a fight. ${witnessName}'s statement skips the moment when the ${keyObject} changed the timeline.`,
                    objective: "Use the room's timeline to expose what the witness omitted."
                }
            ];

            const keyObject = findObject(["window", "door", "coffee mug", "mug", "laptop", "phone", "backpack"]);
            const hiddenObject = findObject(["backpack", "bookshelf", "notebook", "desk", "chair"]);
            const victim = pick(victims, seed, 2);
            const witnessName = pick(witnesses, seed, 4);
            const secondarySuspect = pick(secondarySuspects, seed, 5);
            const profile = pick(caseProfiles, seed, 6);
            const crime = profile.crime;
            const motive = profile.motive;
            const method = profile.method;
            const caseName = `The ${titleCase(keyObject)} ${profile.caseNoun}`;
            const briefing = profile.briefing(victim, witnessName, keyObject, hiddenObject);

            state.caseData = {
                caseName,
                victim,
                crime,
                motive,
                method,
                briefing,
                objective: profile.objective,
                witnessName,
                witnessType: witness.type,
                witnessMood: witness.mood,
                witnessOpening: witness.opening,
                witnessFiller: witness.filler,
                culprit: witnessName,
                secondarySuspect,
                keyObject,
                hiddenObject,
                groundTruth: `${witnessName} confronted ${victim} over ${motive}. They ${method}, using the ${keyObject} to redirect suspicion while the decisive trace remained near the ${hiddenObject}.`,
                lie: `The witness claims the room was undisturbed and that ${victim} was alone before the incident.`,
                evidence: state.inventory.map(object => clueForObject(object, { keyObject, hiddenObject })),
                timeline: [
                    { time: "20:14", text: `${victim} enters the room and places attention on the ${keyObject}.` },
                    { time: "20:19", text: `${secondarySuspect} is mentioned by the witness but never clearly placed in the room.` },
                    { time: "20:23", text: `${witnessName} confronts ${victim} over ${motive}.` },
                    { time: "20:27", text: `The ${keyObject} becomes part of the staged explanation.` },
                    { time: "20:31", text: `The decisive trace is left near the ${hiddenObject}.` },
                    { time: "20:36", text: `${witnessName} gives a confident but incomplete statement.` }
                ]
            };

            state.foundEvidence = [];
            state.contradictions = [];
            state.questions = [];
            state.events = [{ time: "Now", text: `Case generated from ${state.scanSource.toLowerCase()}.` }];
            state.accusation = null;
            state.verdict = null;
            state.scanned = true;
            els.chatLog.innerHTML = "";
            els.revealBox.classList.remove("active");
            els.revealBox.innerHTML = "";
            els.caseFile.textContent = "Investigate the case, submit an accusation, then generate the final report.";
            els.motiveInput.value = "";
            els.methodInput.value = "";
            els.evidenceInput.value = "";
            setStep("case");
            renderAll();
            addMessage("system", "Trace", `Case assigned to Investigator ${state.playerName}. Follow the room evidence before making an accusation.`);
            addMessage("witness", state.caseData.witnessName, state.caseData.witnessOpening);
            showToast("Mystery generated from this room.");
        }

        function renderCase() {
            const data = state.caseData;
            if (!data) {
                els.caseName.textContent = "No case generated";
                els.caseBadge.textContent = "Mystery Engine Idle";
                els.victimFact.textContent = "Awaiting scan";
                els.crimeFact.textContent = "Awaiting scan";
                els.witnessFact.textContent = "Awaiting scan";
                els.motiveFact.textContent = "Awaiting scan";
                els.caseBrief.innerHTML = `<strong>Case Briefing</strong><p>Scan the room, generate a mystery, then inspect objects before accusing anyone.</p>`;
                els.objectList.innerHTML = `<div class="empty">Scan the room or adjust the object list, then generate a case. Each object can become evidence.</div>`;
                els.timelineList.innerHTML = `<div class="empty">The case timeline appears after generation.</div>`;
                els.evidenceList.innerHTML = `<div class="empty">Collected evidence and contradictions will appear here.</div>`;
                els.witnessMood.textContent = "No statement";
                renderSuspects();
                return;
            }

            els.caseName.textContent = data.caseName;
            els.caseBadge.textContent = data.witnessType;
            els.victimFact.textContent = data.victim;
            els.crimeFact.textContent = data.crime;
            els.witnessFact.textContent = data.witnessName;
            els.motiveFact.textContent = data.motive;
            els.witnessMood.textContent = data.witnessMood;
            els.caseBrief.innerHTML = `<strong>Case Briefing</strong><p>${escapeHtml(data.briefing)} <br><br><strong>Objective:</strong> ${escapeHtml(data.objective)}</p>`;

            els.objectList.innerHTML = "";
            data.evidence.forEach(item => {
                const button = document.createElement("button");
                const found = state.foundEvidence.some(evidence => evidence.object === item.object);
                button.type = "button";
                button.className = `object-button${found ? " found" : ""}`;
                button.innerHTML = `<strong>${escapeHtml(titleCase(item.object))}</strong><span>${escapeHtml(found ? item.title : "Inspect this object for a trace.")}</span>`;
                button.addEventListener("click", () => inspectObject(item.object));
                els.objectList.appendChild(button);
            });

            els.timelineList.innerHTML = "";
            data.timeline.forEach(item => {
                const event = document.createElement("div");
                event.className = "event";
                event.innerHTML = `<time>${escapeHtml(item.time)}</time><div>${escapeHtml(item.text)}</div>`;
                els.timelineList.appendChild(event);
            });

            renderSuspects();
        }

        function renderSuspects() {
            const names = state.caseData
                ? [state.caseData.witnessName, "An unknown intruder", state.caseData.victim, "No one"]
                : ["Generate a case first"];
            els.suspectInput.innerHTML = "";
            names.forEach(name => {
                const option = document.createElement("option");
                option.value = name;
                option.textContent = name;
                els.suspectInput.appendChild(option);
            });
        }

        function renderEvidence() {
            els.evidenceCount.textContent = state.foundEvidence.length;
            els.contradictionCount.textContent = state.contradictions.length;
            if (!state.caseData) {
                els.evidenceList.innerHTML = `<div class="empty">Collected evidence and contradictions will appear here.</div>`;
                return;
            }
            if (!state.foundEvidence.length && !state.contradictions.length) {
                els.evidenceList.innerHTML = `<div class="empty">Inspect objects to collect evidence. Ask questions to expose lies.</div>`;
                return;
            }
            els.evidenceList.innerHTML = "";
            state.foundEvidence.forEach(item => {
                const node = document.createElement("div");
                node.className = "evidence-item";
                node.innerHTML = `<strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.detail)}</p>`;
                els.evidenceList.appendChild(node);
            });
            state.contradictions.forEach(item => {
                const node = document.createElement("div");
                node.className = "evidence-item contradiction";
                node.innerHTML = `<strong>Contradiction</strong><p>${escapeHtml(item)}</p>`;
                els.evidenceList.appendChild(node);
            });
        }

        function renderEvents() {
            if (!state.events.length) {
                return;
            }
            const extra = state.events.slice(1).map(item => ({ time: item.time, text: item.text }));
            if (state.caseData) {
                const merged = [...state.caseData.timeline, ...extra];
                els.timelineList.innerHTML = "";
                merged.forEach(item => {
                const event = document.createElement("div");
                event.className = "event";
                event.innerHTML = `<time>${escapeHtml(item.time)}</time><div>${escapeHtml(item.text)}</div>`;
                els.timelineList.appendChild(event);
            });
            }
        }

        function renderChat() {
            if (!state.caseData && !els.chatLog.children.length) {
                els.chatLog.innerHTML = `<div class="empty">Generate a case to meet the witness.</div>`;
            }
        }

        function renderAll() {
            renderInventory();
            renderCase();
            renderEvidence();
            renderEvents();
            renderChat();
            els.scanStatus.textContent = state.scanned ? "Room context stored" : "Room not scanned";
            els.playerStatus.textContent = state.playerName
                ? `Investigator ${state.playerName} is assigned to this scene.`
                : "Your name appears in the witness exchange and final case file.";
            els.scanNote.textContent = state.scanned
                ? `${state.scanSource} captured ${state.inventory.length} possible evidence objects. Generate a case or add anything the scan missed.`
                : "Enter your name, then start a camera scan. Trace will capture the room and reveal objects as evidence candidates.";
            setCameraPrompt(
                state.scanned ? "success" : "ready",
                state.scanned ? "Room scan complete" : "Camera briefing",
                state.scanned
                    ? "Trace has enough room evidence for this case. Re-scan any time if the scene changes."
                    : "When your browser asks, choose Allow so Trace can scan the room you are standing in."
            );
            document.getElementById("generateBtn").disabled = !state.scanned;
            els.objectInput.disabled = !state.scanned;
            document.getElementById("addObjectBtn").disabled = !state.scanned;
        }

        function addObject() {
            if (!state.scanned) {
                showToast("Scan the room first, then add anything Trace missed.");
                return;
            }
            const value = els.objectInput.value.trim();
            if (!value) return;
            state.inventory = unique([...state.inventory, value]);
            els.objectInput.value = "";
            renderAll();
        }

        function getPlayerName() {
            return els.playerNameInput.value.trim().replace(/\s+/g, " ");
        }

        function validatePlayerName() {
            const name = getPlayerName();
            if (!name) {
                els.playerNameInput.focus();
                els.playerStatus.textContent = "Enter your investigator name before scanning the room.";
                showToast("Enter your name to begin the investigation.");
                return "";
            }
            state.playerName = name;
            return name;
        }

        async function waitForCameraReady() {
            if (els.camera.videoWidth && els.camera.videoHeight) {
                return true;
            }
            return new Promise(resolve => {
                const done = () => resolve(Boolean(els.camera.videoWidth && els.camera.videoHeight));
                els.camera.onloadedmetadata = done;
                window.setTimeout(done, 1400);
            });
        }

        function analyzeCameraFrame(canvas) {
            const context = canvas.getContext("2d");
            const width = canvas.width;
            const height = canvas.height;
            const sample = context.getImageData(0, 0, width, height).data;
            let brightness = 0;
            let warm = 0;
            let cool = 0;
            let contrast = 0;
            const stride = Math.max(4, Math.floor(sample.length / 2400));
            for (let i = 0; i < sample.length; i += stride * 4) {
                const r = sample[i];
                const g = sample[i + 1];
                const b = sample[i + 2];
                brightness += (r + g + b) / 3;
                warm += Math.max(0, r - b);
                cool += Math.max(0, b - r);
                contrast += Math.max(r, g, b) - Math.min(r, g, b);
            }
            const points = Math.max(1, Math.floor(sample.length / (stride * 4)));
            return {
                brightness: brightness / points,
                warm: warm / points,
                cool: cool / points,
                contrast: contrast / points
            };
        }

        function detectObjectsFromScan(signature) {
            const base = ["desk", "chair"];
            const brightRoom = signature.brightness > 125;
            const highContrast = signature.contrast > 55;
            const coolRoom = signature.cool > signature.warm;
            const detected = [
                ...base,
                brightRoom ? "window" : "lamp",
                coolRoom ? "laptop" : "coffee mug",
                highContrast ? "backpack" : "notebook",
                pick(DETECTABLE_OBJECTS, Math.round(signature.brightness), 2),
                pick(DETECTABLE_OBJECTS, Math.round(signature.contrast), 5),
                pick(DETECTABLE_OBJECTS, Math.round(signature.warm + signature.cool), 8)
            ];
            return unique(detected).slice(0, 9);
        }

        function hasActiveCameraStream() {
            return state.stream && state.stream.getTracks().some(track => track.readyState === "live");
        }

        function captureCameraFrame() {
            if (!state.stream || !els.camera.videoWidth || !els.camera.videoHeight) {
                return null;
            }
            const canvas = document.createElement("canvas");
            const maxWidth = 960;
            const scale = Math.min(1, maxWidth / els.camera.videoWidth);
            canvas.width = Math.round(els.camera.videoWidth * scale);
            canvas.height = Math.round(els.camera.videoHeight * scale);
            const context = canvas.getContext("2d");
            context.drawImage(els.camera, 0, 0, canvas.width, canvas.height);
            const signature = analyzeCameraFrame(canvas);
            const imageDataUrl = canvas.toDataURL("image/jpeg", 0.82);
            if (state.imageUrl) {
                URL.revokeObjectURL(state.imageUrl);
                state.imageUrl = "";
            }
            els.previewImage.src = imageDataUrl;
            els.previewImage.classList.add("active");
            els.camera.classList.remove("active");
            state.stream.getTracks().forEach(track => track.stop());
            state.stream = null;
            syncCameraToggle(false, "Off after capture");
            state.scanSource = "Camera frame";
            return { signature, imageDataUrl };
        }

        async function requestCameraStream() {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("Camera is not available in this browser.");
            }
            if (state.stream) {
                state.stream.getTracks().forEach(track => track.stop());
            }
            state.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
                audio: false
            });
            els.camera.srcObject = state.stream;
            els.camera.classList.add("active");
            els.previewImage.classList.remove("active");
            els.sceneFrame.classList.add("has-media");
            state.scanSource = "Live camera";
            await waitForCameraReady();
            syncCameraToggle(true, "On and ready to scan");
        }

        function stopCameraStream(label = "Camera switched off") {
            if (state.stream) {
                state.stream.getTracks().forEach(track => track.stop());
                state.stream = null;
            }
            els.camera.srcObject = null;
            els.camera.classList.remove("active");
            if (!els.previewImage.classList.contains("active")) {
                els.sceneFrame.classList.remove("has-media");
            }
            syncCameraToggle(false, label);
        }

        function describeCameraError(error) {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                return {
                    title: "Camera unavailable",
                    body: "This browser cannot access the camera. Open Trace on localhost in a modern browser, then try again."
                };
            }
            if (error && error.name === "NotAllowedError") {
                return {
                    title: "Turn on camera permission",
                    body: "Allow camera access for localhost, then press Try Camera Again. If macOS blocks it, enable camera access for your browser in System Settings."
                };
            }
            if (error && error.name === "NotFoundError") {
                return {
                    title: "No camera found",
                    body: "Connect a camera or switch to a device with a camera, then try the scan again."
                };
            }
            if (error && error.name === "NotReadableError") {
                return {
                    title: "Camera is busy",
                    body: "Another app is using the camera. Close that app, then press Try Camera Again."
                };
            }
            if (error && error.name === "SecurityError") {
                return {
                    title: "Browser blocked the scan",
                    body: "Use http://localhost:8000 and allow camera access in your browser site settings."
                };
            }
            return {
                title: "Camera permission needed",
                body: error && error.message ? error.message : "Camera permission was blocked or unavailable. Turn it on, then try again."
            };
        }

        async function scanRoom() {
            const name = validatePlayerName();
            if (!name) return;

            els.sceneFrame.classList.add("scanning");
            els.scanStatus.textContent = hasActiveCameraStream() ? "Camera ready" : "Requesting camera...";
            els.scanNote.textContent = hasActiveCameraStream()
                ? "Camera is on. Trace is about to capture your room."
                : "Allow camera access so Trace can scan your actual room.";
            setCameraPrompt(
                "active",
                hasActiveCameraStream() ? "Camera already on" : "Permission request sent",
                hasActiveCameraStream()
                    ? "Trace will use the live camera feed you turned on."
                    : "Look for the browser camera prompt and choose Allow. Trace will begin scanning as soon as permission is granted."
            );
            document.getElementById("scanBtn").disabled = true;
            document.getElementById("scanBtn").textContent = hasActiveCameraStream() ? "Scanning..." : "Requesting...";
            setStep("scan");

            try {
                if (!hasActiveCameraStream()) {
                    await requestCameraStream();
                }
                els.scanStatus.textContent = "Scanning room...";
                els.scanNote.textContent = `Hold steady, ${name}. Trace is looking for evidence objects in the room.`;
                setCameraPrompt("active", "Camera live", "Keep the room in view for a moment while Trace captures possible evidence objects.");
                document.getElementById("scanBtn").textContent = "Scanning...";

                await new Promise(resolve => window.setTimeout(resolve, 1700));
                const capturedFrame = captureCameraFrame();
                if (!capturedFrame) {
                    throw new Error("Camera did not produce a frame.");
                }
                const { signature, imageDataUrl } = capturedFrame;
                const seed = hashText(`${name}|${signature.brightness}|${signature.contrast}|${Date.now()}`);
                const backendScan = await postJsonOptional("/api/scan", {
                    playerName: name,
                    signature,
                    imageDataUrl
                });
                const detected = backendScan && Array.isArray(backendScan.objects)
                    ? backendScan.objects
                    : detectObjectsFromScan(signature);
                const additions = [
                    pick(EXTRA_OBJECTS, seed),
                    pick(EXTRA_OBJECTS, seed, 3)
                ];
                state.inventory = unique([...detected, ...additions]).slice(0, 10);
                state.scanSource = backendScan && backendScan.source === "openai"
                    ? `${name}'s OpenAI vision scan`
                    : `${name}'s camera scan`;
                state.scanTime = new Date();
                state.scanned = true;
                els.sceneFrame.classList.remove("scanning");
                document.getElementById("scanBtn").disabled = false;
                document.getElementById("scanBtn").textContent = "Re-scan Room";
                renderAll();
                showToast(backendScan && backendScan.source === "openai"
                    ? `${state.inventory.length} room objects detected with OpenAI Vision.`
                    : `${state.inventory.length} room objects detected.`);
            } catch (error) {
                stopCameraStream("Permission still off");
                const cameraMessage = describeCameraError(error);
                els.sceneFrame.classList.remove("scanning");
                document.getElementById("scanBtn").disabled = false;
                document.getElementById("scanBtn").textContent = "Try Camera Again";
                els.scanStatus.textContent = "Camera needed";
                els.scanNote.textContent = cameraMessage.body;
                setCameraPrompt("error", cameraMessage.title, cameraMessage.body);
                showToast(cameraMessage.title);
            }
        }

        async function toggleCameraAccess(event) {
            if (!event.target.checked) {
                stopCameraStream("Off until you turn it on");
                setCameraPrompt("ready", "Camera switched off", "Turn Camera Access on when you are ready to scan the room.");
                els.scanStatus.textContent = state.scanned ? "Room context stored" : "Camera off";
                return;
            }

            const name = getPlayerName();

            els.cameraToggle.disabled = true;
            els.scanStatus.textContent = "Turning camera on...";
            els.scanNote.textContent = "Trace is asking the browser to turn on your camera.";
            setCameraPrompt("active", "Turn camera on", "Choose Allow in the browser prompt. If the camera is blocked, enable it in browser or macOS settings, then try again.");

            try {
                await requestCameraStream();
                els.scanStatus.textContent = "Camera on";
                els.scanNote.textContent = name
                    ? `Camera is on, ${name}. Press Scan Room when the room is in view.`
                    : "Camera is on. Enter your investigator name, then press Scan Room when the room is in view.";
                setCameraPrompt("active", "Camera on", "Live preview is ready. Keep the room in view and start the scan.");
                document.getElementById("scanBtn").textContent = state.scanned ? "Re-scan Room" : "Scan Room";
            } catch (error) {
                stopCameraStream("Permission still off");
                const cameraMessage = describeCameraError(error);
                els.scanStatus.textContent = "Camera needed";
                els.scanNote.textContent = cameraMessage.body;
                setCameraPrompt("error", cameraMessage.title, cameraMessage.body);
                showToast(cameraMessage.title);
            } finally {
                els.cameraToggle.disabled = false;
            }
        }

        function inspectObject(object) {
            if (!state.caseData) {
                showToast("Generate a case before inspecting evidence.");
                return;
            }
            const item = state.caseData.evidence.find(evidence => evidence.object === object);
            if (!item) return;
            const alreadyFound = state.foundEvidence.some(evidence => evidence.object === object);
            if (!alreadyFound) {
                state.foundEvidence.push(item);
                state.events.push({ time: "Found", text: `${item.title}: ${item.detail}` });
                if ((object === state.caseData.keyObject || object === state.caseData.hiddenObject) && !state.contradictions.includes(item.contradiction)) {
                    state.contradictions.push(item.contradiction);
                    addMessage("system", "Trace", item.contradiction);
                }
                setStep("investigate");
                renderAll();
                showToast("Evidence added.");
            } else {
                showToast("Evidence already collected.");
            }
        }

        function addMessage(kind, speaker, text) {
            if (els.chatLog.querySelector(".empty")) {
                els.chatLog.innerHTML = "";
            }
            const node = document.createElement("div");
            node.className = `message ${kind}`;
            node.innerHTML = `<small>${escapeHtml(speaker)}</small>${escapeHtml(text)}`;
            els.chatLog.appendChild(node);
            els.chatLog.scrollTop = els.chatLog.scrollHeight;
        }

        function witnessReply(question) {
            const data = state.caseData;
            const q = question.toLowerCase();
            const foundKey = state.foundEvidence.some(item => item.object === data.keyObject);
            const foundHidden = state.foundEvidence.some(item => item.object === data.hiddenObject);

            if ((q.includes("window") || q.includes("door") || q.includes("enter")) && foundKey) {
                addContradiction(`Pressed on entry point: ${data.witnessName} hesitated after evidence from the ${data.keyObject}.`);
                return `I said nobody entered because that is what I wanted to believe. The ${data.keyObject} does complicate that, yes.`;
            }
            if ((q.includes("touch") || q.includes("object") || q.includes(data.hiddenObject)) && foundHidden) {
                addContradiction(`Hidden clue challenged: the ${data.hiddenObject} places the witness closer to the scene than they admitted.`);
                return `I may have touched the ${data.hiddenObject}, but that does not mean I caused what happened.`;
            }
            if (q.includes("where") || q.includes("when")) {
                return `I was near the doorway for most of it. I never crossed the room, and ${data.victim} was alone when the real trouble started.`;
            }
            if (q.includes("believe") || q.includes("lie")) {
                return `Because I stayed here and answered you. A guilty person would have run, would they not?`;
            }
            if (q.includes("motive") || q.includes("why")) {
                return `People always want a motive. ${data.victim} had enemies, but I was not one of them.`;
            }
            if (q.includes("victim") || q.includes(data.victim.toLowerCase().split(" ")[0])) {
                return `${data.victim} was nervous. They kept looking at the ${data.keyObject}. I thought it was paranoia.`;
            }
            return data.witnessFiller;
        }

        function addContradiction(text) {
            if (!state.contradictions.includes(text)) {
                state.contradictions.push(text);
                state.events.push({ time: "Conflict", text });
                renderAll();
            }
        }

        function askWitness(question) {
            if (!state.caseData) {
                showToast("Generate a case before questioning the witness.");
                return;
            }
            const clean = question.trim();
            if (!clean) return;
            state.questions.push(clean);
            addMessage("player", state.playerName || "Investigator", clean);
            const reply = witnessReply(clean);
            window.setTimeout(() => addMessage("witness", state.caseData.witnessName, reply), 180);
            els.chatInput.value = "";
        }

        function submitAccusation(event) {
            event.preventDefault();
            if (!state.caseData) {
                showToast("Generate a case before submitting an accusation.");
                return;
            }
            const suspect = els.suspectInput.value;
            const motiveText = els.motiveInput.value.trim();
            const methodText = els.methodInput.value.trim();
            const evidenceText = els.evidenceInput.value.trim();
            const motive = motiveText.toLowerCase();
            const method = methodText.toLowerCase();
            const evidence = evidenceText.toLowerCase();
            let score = 0;
            if (suspect === state.caseData.culprit) score += 40;
            if (motive.includes(state.caseData.motive.split(" ")[0]) || motive.includes("exposure") || motive.includes("secret")) score += 20;
            if (method.includes(state.caseData.keyObject) || method.includes(state.caseData.method.split(" ")[0])) score += 20;
            if (evidence.includes(state.caseData.keyObject) || evidence.includes(state.caseData.hiddenObject) || state.foundEvidence.length >= 3) score += 20;

            const verdict = score >= 70 ? "Case Solved" : score >= 45 ? "Partially Solved" : "Theory Rejected";
            state.accusation = {
                suspect,
                motive: motiveText || "No motive provided",
                method: methodText || "No method provided",
                evidence: evidenceText || "No key evidence provided"
            };
            state.verdict = {
                label: verdict,
                score,
                summary: score >= 70
                    ? "The theory matches the culprit, method, and evidence chain."
                    : score >= 45
                        ? "The theory identifies part of the truth but misses a critical link."
                        : "The theory does not yet satisfy the evidence."
            };
            els.revealBox.classList.add("active");
            els.revealBox.innerHTML = `
                <h3>${escapeHtml(verdict)} - ${score}/100</h3>
                <p><strong>Assessment:</strong> ${escapeHtml(state.verdict.summary)}</p>
                <p><strong>Truth:</strong> ${escapeHtml(state.caseData.groundTruth)}</p>
                <p><strong>Lie:</strong> ${escapeHtml(state.caseData.lie)}</p>
                <p><strong>Key objects:</strong> ${escapeHtml(titleCase(state.caseData.keyObject))} and ${escapeHtml(titleCase(state.caseData.hiddenObject))}.</p>
                <p><strong>Your theory:</strong> ${escapeHtml(suspect)} / ${escapeHtml(state.accusation.motive)} / ${escapeHtml(state.accusation.method)}.</p>
            `;
            setStep("reveal");
            state.events.push({ time: "Verdict", text: `${verdict} with a score of ${score}/100.` });
            renderEvidence();
            renderEvents();
            buildCaseFile();
        }

        function buildCaseFile() {
            if (!state.caseData) {
                showToast("Generate a case first.");
                return;
            }
            const data = state.caseData;
            const verdict = state.verdict || { label: "Investigation Open", score: "N/A", summary: "No accusation has been submitted yet." };
            const accusation = state.accusation || {
                suspect: "No suspect submitted",
                motive: "No motive submitted",
                method: "No method submitted",
                evidence: "No evidence submitted"
            };
            const scanDate = state.scanTime ? state.scanTime.toLocaleString() : "Not recorded";
            const scoreLine = verdict.score === "N/A" ? "N/A" : `${verdict.score}/100`;
            const lines = [
                "TRACE INVESTIGATION REPORT",
                "==========================",
                "",
                `Case: ${data.caseName}`,
                `Investigator: ${state.playerName || "Unnamed investigator"}`,
                `Status: ${verdict.label}`,
                `Score: ${scoreLine}`,
                `Generated From: ${state.scanSource}`,
                `Scan Time: ${scanDate}`,
                "",
                "Case Briefing",
                "-------------",
                data.briefing,
                "",
                `Investigation Objective: ${data.objective}`,
                "",
                "Primary Facts",
                "-------------",
                `Victim: ${data.victim}`,
                `Crime: ${data.crime}`,
                `Witness: ${data.witnessName} (${data.witnessType})`,
                `Motive: ${data.motive}`,
                `Secondary Suspect: ${data.secondarySuspect}`,
                "",
                "Submitted Theory",
                "----------------",
                `Suspect: ${accusation.suspect}`,
                `Motive: ${accusation.motive}`,
                `Method: ${accusation.method}`,
                `Key Evidence: ${accusation.evidence}`,
                "",
                "Reveal Assessment",
                "-----------------",
                verdict.summary,
                "",
                "Room Inventory",
                "--------------",
                ...state.inventory.map(item => `- ${titleCase(item)}`),
                "",
                "Evidence Collected",
                "------------------",
                ...(state.foundEvidence.length ? state.foundEvidence.map(item => `- ${item.title}: ${item.detail}`) : ["- None"]),
                "",
                "Contradictions",
                "--------------",
                ...(state.contradictions.length ? state.contradictions.map(item => `- ${item}`) : ["- None"]),
                "",
                "Timeline",
                "--------",
                ...data.timeline.map(item => `- ${item.time}: ${item.text}`),
                "",
                "Questions Asked",
                "---------------",
                ...(state.questions.length ? state.questions.map(item => `- ${item}`) : ["- None"]),
                "",
                "Ground Truth",
                "------------",
                data.groundTruth,
                "",
                "Witness Lie",
                "-----------",
                data.lie
            ];
            els.caseFile.textContent = lines.join("\n");
            setStep("reveal");
            showToast("Case file generated.");
        }

        function downloadCaseFile() {
            const text = els.caseFile.textContent.trim();
            if (!text || text.startsWith("Generate a case")) {
                showToast("Generate the case file first.");
                return;
            }
            const blob = new Blob([text], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = "trace-case-file.txt";
            anchor.click();
            URL.revokeObjectURL(url);
        }

        function resetRoom() {
            state.inventory = [...DEFAULT_OBJECTS];
            state.scanned = false;
            state.caseData = null;
            state.foundEvidence = [];
            state.contradictions = [];
            state.questions = [];
            state.events = [];
            state.accusation = null;
            state.verdict = null;
            state.scanSource = "No camera scan yet";
            state.scanTime = null;
            stopCameraStream("Off until you turn it on");
            if (state.imageUrl) {
                URL.revokeObjectURL(state.imageUrl);
                state.imageUrl = "";
            }
            els.chatLog.innerHTML = "";
            els.revealBox.classList.remove("active");
            els.revealBox.innerHTML = "";
            els.caseFile.textContent = "Generate a case, inspect evidence, question the witness, then build the final case file.";
            els.previewImage.classList.remove("active");
            els.previewImage.removeAttribute("src");
            els.camera.classList.remove("active");
            els.sceneFrame.classList.remove("has-media", "scanning");
            document.getElementById("scanBtn").disabled = false;
            document.getElementById("scanBtn").textContent = "Request Camera + Scan";
            els.scanNote.textContent = "Enter your name, then start a camera scan. Trace will capture the room and reveal objects as evidence candidates.";
            setCameraPrompt("ready", "Camera briefing", "When your browser asks, choose Allow so Trace can scan the room you are standing in.");
            syncCameraToggle(false, "Off until you turn it on");
            setStep("scan");
            renderAll();
            showToast("Room reset.");
        }

        document.getElementById("scanBtn").addEventListener("click", scanRoom);
        document.getElementById("cameraToggle").addEventListener("change", toggleCameraAccess);
        document.querySelectorAll(".launch-app").forEach(button => {
            button.addEventListener("click", () => openApp());
        });
        document.getElementById("landingBtn").addEventListener("click", () => openLanding());
        document.getElementById("addObjectBtn").addEventListener("click", addObject);
        document.getElementById("generateBtn").addEventListener("click", generateCase);
        document.getElementById("resetBtn").addEventListener("click", resetRoom);
        document.getElementById("buildFileBtn").addEventListener("click", buildCaseFile);
        document.getElementById("downloadFileBtn").addEventListener("click", downloadCaseFile);
        document.getElementById("objectInput").addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                addObject();
            }
        });
        document.getElementById("chatForm").addEventListener("submit", event => {
            event.preventDefault();
            askWitness(els.chatInput.value);
        });
        document.getElementById("accuseForm").addEventListener("submit", submitAccusation);
        document.querySelectorAll(".quick-questions button").forEach(button => {
            button.addEventListener("click", () => askWitness(button.dataset.question));
        });
        document.querySelectorAll(".tab").forEach(tab => {
            tab.addEventListener("click", () => {
                document.querySelectorAll(".tab").forEach(node => node.classList.remove("active"));
                document.querySelectorAll(".view").forEach(node => node.classList.remove("active"));
                tab.classList.add("active");
                document.getElementById(tab.dataset.view).classList.add("active");
                if (tab.dataset.view === "accuseView") setStep("accuse");
            });
        });

        window.addEventListener("popstate", () => {
            if (window.location.hash === "#app") {
                openApp(false);
            } else {
                openLanding(false);
            }
        });

        if (window.location.hash === "#app") {
            openApp(false);
        }

        renderAll();
    
