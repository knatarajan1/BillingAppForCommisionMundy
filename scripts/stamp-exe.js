/**
 * stamp-exe.js
 * Patches Windows PE version resources in the 32-bit and 64-bit exe files
 * so that File Properties -> Details shows the correct app version and build date.
 *
 * Strategy: copy exe -> tmp, patch tmp, copy tmp back (avoids in-place write lock).
 *
 * Usage:  node scripts/stamp-exe.js   (or: npm run stamp)
 */

const path   = require('path')
const fs     = require('fs')
const os     = require('os')
const { rcedit } = require('rcedit')
const pkg    = require('../package.json')

const VERSION     = pkg.version                           // e.g. "2.3.1"
const WIN_VERSION = VERSION + '.0'                        // Windows 4-part: "2.3.1.0"
const YEAR        = new Date().getFullYear()
const BUILD_DATE  = new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"

const ICON = path.join(__dirname, '../public/icon.ico')

const VERSION_STRINGS = {
  ProductName:      'KKS Commission Mundy',
  FileDescription:  `KKS Commission Mundy v${VERSION} - Agricultural Commission Management`,
  CompanyName:      'KKS',
  LegalCopyright:   `Copyright (c) ${YEAR} KKS`,
  OriginalFilename: 'KKS Commission Mundy.exe',
  InternalName:     'kks-commission-mundy',
  Comments:         `Build: ${BUILD_DATE}`,
}

const DIST_ROOT = path.join(__dirname, '../KKS-Commission-Mundy-v2-Windows')

const TARGETS = [
  { exe: path.join(DIST_ROOT, '64-bit', 'KKS Commission Mundy.exe'), label: '64-bit' },
  { exe: path.join(DIST_ROOT, '32-bit', 'KKS Commission Mundy.exe'), label: '32-bit' },
]

async function stampOne(target) {
  const tmp = path.join(os.tmpdir(), `kks-stamp-${target.label}.exe`)

  // 1. Copy original to tmp so we can write to it freely
  fs.copyFileSync(target.exe, tmp)

  // 2. Patch the temp copy
  await rcedit(tmp, {
    'product-version': VERSION,
    'file-version':    WIN_VERSION,
    'version-string':  VERSION_STRINGS,
    'icon':            ICON,
  })

  // 3. Replace original with patched copy
  fs.copyFileSync(tmp, target.exe)
  fs.unlinkSync(tmp)
}

async function main() {
  console.log(`\nStamping executables — v${VERSION}  build ${BUILD_DATE}\n`)
  for (const target of TARGETS) {
    process.stdout.write(`  ${target.label}  ${target.exe} ... `)
    await stampOne(target)
    console.log('ok')
  }
  console.log('\nDone. Right-click the exe -> Properties -> Details to verify.')
}

main().catch(err => { console.error('\nStamp failed:', err.message); process.exit(1) })
