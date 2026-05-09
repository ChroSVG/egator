# Project Cleanup Plan

This plan will help make the project cleaner and easier to work with.

## 1. Clean up the Server Folder
Right now, the `server` folder has too many files in the main area.
- **Goal:** Move extra files to the right place.
- **Action:** 
  - Move all `.md` files (like `MAINTENANCE-GUIDE.md`) into a new folder called `docs`.
  - Move test files (like `load-test.js` and `stress-test.js`) into the `tests` or a new `scripts` folder.
  - Delete `qwen-code-export-...` if you don't need it anymore. It is very large.

## 2. Remove Redundant package.json
The project has three `package.json` files.
- **Goal:** Only keep what we need.
- **Action:** 
  - The `package.json` in the root folder has the same stuff as the one in the `server` folder. We should decide if we want to use "Workspaces" or just delete the root one if it's not used for anything special.

## 3. Merge Shared Code
If the `client` and `server` use the same logic (like validation rules), we can put them in a shared folder.
- **Goal:** Don't write the same code twice.
- **Action:** Create a `shared` folder for code used by both frontend and backend.

## 4. How to "Merge"
If you are asking how to merge code or folders:
- **Folders:** You can move the `client` and `server` folders into a single structure if the project is small.
- **Git:** If you want to merge two branches, use the command: `git merge branch-name`.

---
**Simple Rule:** If a file is not being used, delete it. If a folder is messy, group files into sub-folders.
