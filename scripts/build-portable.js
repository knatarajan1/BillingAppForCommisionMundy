/**
 * build-portable.js
 * Packages the app into a portable Windows distribution folder:
 *
 *   KKS-Commission-Mundy-v2-Windows/
 *     HOW-TO-RUN.txt
 *     64-bit/
 *       KKS Commission Mundy.exe   ← double-click to run
 *       ...
 *     32-bit/
 *       KKS Commission Mundy.exe
 *       ...
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT     = path.join(__dirname, '..')
const DIST_DIR = path.join(ROOT, 'KKS-Commission-Mundy-v2-Windows')
const PKG      = require(path.join(ROOT, 'package.json'))
const VERSION  = PKG.version

function run(cmd) {
  execSync(cmd, { cwd: ROOT, stdio: 'inherit', shell: true })
}

// ─── 1. Vite build ────────────────────────────────────────────────
console.log('\n=== Building frontend... ===')
run('npm run build')

// ─── 2. Clean output dir ──────────────────────────────────────────
console.log('\n=== Cleaning previous output... ===')
if (fs.existsSync(DIST_DIR)) fs.rmSync(DIST_DIR, { recursive: true, force: true })
fs.mkdirSync(DIST_DIR, { recursive: true })

const RELEASE_TEMP = path.join(ROOT, 'release')
if (fs.existsSync(RELEASE_TEMP)) fs.rmSync(RELEASE_TEMP, { recursive: true, force: true })
fs.mkdirSync(RELEASE_TEMP, { recursive: true })

// ─── 3. Package for each arch ────────────────────────────────────
const ICON = path.join(ROOT, 'public', 'icon.ico')

for (const [arch, label] of [['x64', '64-bit'], ['ia32', '32-bit']]) {
  console.log(`\n=== Packaging ${label} (${arch})... ===`)

  run(
    `npx --yes @electron/packager . "KKS Commission Mundy"` +
    ` --platform=win32 --arch=${arch}` +
    ` --out="${path.join(RELEASE_TEMP, arch)}"` +
    ` --overwrite --asar --prune` +
    ` --icon="${ICON}"`
  )

  const src = path.join(RELEASE_TEMP, arch, `KKS Commission Mundy-win32-${arch}`)
  const dst = path.join(DIST_DIR, label)
  fs.renameSync(src, dst)
  console.log(`   => ${dst}`)
}

// ─── 4. Cleanup temp release dir ─────────────────────────────────
fs.rmSync(RELEASE_TEMP, { recursive: true, force: true })

// ─── 5. Write HOW-TO-RUN.txt ──────────────────────────────────────
const howTo = `\
╔══════════════════════════════════════════════════════════════╗
║        KKS Commission Mundy  v${VERSION} — Portable App             ║
║        No installation needed. Just click and run!          ║
╚══════════════════════════════════════════════════════════════╝

HOW TO RUN
──────────
1. Check whether your Windows machine is 32-bit or 64-bit:
   • Right-click "This PC" → Properties → look for "System type"

2. Based on your system type:

   ➤ 64-bit Windows  →  Open the "64-bit" folder
                         Double-click "KKS Commission Mundy.exe"

   ➤ 32-bit Windows  →  Open the "32-bit" folder
                         Double-click "KKS Commission Mundy.exe"

FIRST TIME LAUNCH
─────────────────
• The app will automatically create your database at:
    C:\\Users\\<YourName>\\AppData\\Roaming\\KKS Commission Mundy\\

• If Windows shows a SmartScreen warning, click:
    "More info"  →  "Run anyway"
  (This appears because the exe is unsigned — it is safe to run)

DATA BACKUP
───────────
• To back up all your data, copy CommissionMundy.db from:
    C:\\Users\\<YourName>\\AppData\\Roaming\\KKS Commission Mundy\\
  to a safe location.
• To restore, paste it back to the same path before launching.

FOLDER CONTENTS
───────────────
  64-bit\\   → For 64-bit Windows  (most modern PCs after 2010)
  32-bit\\   → For 32-bit Windows  (older PCs)

──────────────────────────────────────────────────
KKS Commission Mundy System  v${VERSION}
──────────────────────────────────────────────────
`

fs.writeFileSync(path.join(DIST_DIR, 'HOW-TO-RUN.txt'), howTo, 'utf8')

// ─── 6. Done ──────────────────────────────────────────────────────
console.log(`
==============================================
 Distribution folder ready:
 ${DIST_DIR}

 Structure:
   HOW-TO-RUN.txt
   64-bit\\KKS Commission Mundy.exe   <- double-click on 64-bit Windows
   32-bit\\KKS Commission Mundy.exe   <- double-click on 32-bit Windows
==============================================
`)
