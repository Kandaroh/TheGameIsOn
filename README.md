# TheGameIsOn

A modular card game scaffold with Angular frontend and Node.js backend.

Folders:
- `frontend/` — feature modules, shared models, and API services.
- `backend/` — Express API routes, controllers, services, repository persistence, and JSON-serializable game state.
- `docs/` — architecture overview and extension patterns.

## Running the project

1. Install dependencies for both frontend and backend.
```
cd backend
npm install
cd ../frontend
npm install
```
2. Start the backend API server.
```
cd backend
npm run start
```
3. Start the frontend app.
```
cd frontend
npm run start
```

Open `http://localhost:4200` in a browser. The frontend communicates with the backend at `http://localhost:4000`.

See `docs/architecture.md` and `docs/development-guide.md` for implementation details and extension guidance.

Notes:
- The map visualization has been enlarged to occupy more vertical viewport space and is scrollable by default; styles are in `frontend/src/styles.css`.
- Use `docs/map-generator.md` and `docs/copilot-context.md` for quick reference on the generator and project layout.

Testing the new event/spawn features:
- Backend spawn-rule unit tests:
	- Run from `backend`:
	```powershell
	cd backend
	npm run test:spawn
	```
- Frontend crossing check (requires backend running):
	- Start backend and frontend, then in `frontend`:
	```bash
	npm run test:cross
	```

