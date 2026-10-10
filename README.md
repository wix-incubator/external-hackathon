## Getting started

1. **Node.js** — install Node 22.12 or newer (`node -v` to check).
2. **Install dependencies**
   ```sh
    npm install
   ```
3. **Log in to the Wix CLI**
   ```sh
    npx wix login
   ```
4. **Pull environment variables** into `.env.local`
   ```sh
    npm run env pull
   ```
5. **Start the dev server** at [http://localhost:4321](http://localhost:4321)
   ```sh
    npm run dev
   ```

## Scripts


| Command           | What it does                 |
| ----------------- | ---------------------------- |
| `npm run dev`     | Start the local dev server   |
| `npm run build`   | Build for production         |
| `npm run preview` | Create a preview version     |
| `npm run release` | Release a new version to Wix |


