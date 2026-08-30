#!/usr/bin/env bash
# One-off image derivative generator for the RAT PMC site (Stage 9).
# NOT a build step — run manually after adding/replacing a source photo, then
# commit the derivatives. Needs: cwebp (brew install webp) + sips (macOS).
#
# For every source photo it writes, next to the file:
#   <base>-512.webp    width 512   cwebp -q 70        grid, 1x DPR
#   <base>-768.webp    width 768   cwebp -q 68 -m 6   grid, 2x DPR
#   <base>-1080.webp   native      cwebp -q 72 -m 6   lightbox / full view
#   <base>-1080.jpg    native      sips "normal"      non-webp fallback
# Hero images (already Stage-4 derivatives) only get a native .webp added;
# their .jpg is left untouched.
set -euo pipefail
cd "$(dirname "$0")/.."
command -v cwebp >/dev/null || { echo "cwebp missing — brew install webp"; exit 1; }

PHOTOS=(
  imgs/2023/Me_Behind_Right.jpg imgs/2023/SSLBetter_Right.jpg
  imgs/2024/HYG_Right.jpg imgs/2024/Me_CloseUp_right.jpg imgs/2024/Me_Far_Right.jpg
  imgs/2024/Ondra_Back_right.jpg imgs/2024/SL_Right.jpg imgs/2024/Seba_reload_right.jpg
  imgs/2025/ME_CLIFF_LOOK.jpg imgs/2025/ME_CQB.jpg imgs/2025/Me_Teach_Low.jpg
  imgs/2025/Me_Teach_Ondra_Aim.jpg imgs/2025/SEBA_LOOK_UP.jpg
  imgs/2025/Whitcher_Trench_Aim_Better_Right.jpg
  imgs/2026/cukrak_flag.jpg imgs/2026/darius_aim_walk.jpg imgs/2026/likeminded.jpg
  imgs/2026/me_cover_low_ready.jpg imgs/2026/me_hug.jpg
  imgs/2026/me_nvg_line_left_stay_lethal_fix.jpg imgs/2026/ondra_lying.jpg
  imgs/2026/radar_prone_rock.jpg imgs/2026/radar_solo.jpg
  imgs/2026/radon_popelka_stand_stay_lethal.jpg imgs/2026/whitcher_peek.jpg
  imgs/2026/whitcher_quarry_stay_lethal_fix.jpg
  imgs/SEBA_AIM_BACK.jpg
  imgs/Me_train_ondra_aim_cropped_fixed.jpg imgs/WHITCHER_TRENCH.jpg
  imgs/Seba_Aim_Back_cropped_Fixed.jpg
)

kb(){ echo "$(( $(stat -f%z "$1") / 1024 ))"; }

echo "== photos =="
total=0
for p in "${PHOTOS[@]}"; do
  [ -f "$p" ] || { echo "MISSING $p"; exit 1; }
  b="${p%.*}"
  cwebp -quiet -q 70          -resize 512 0 "$p" -o "${b}-512.webp"
  cwebp -quiet -q 68 -m 6     -resize 768 0 "$p" -o "${b}-768.webp"
  cwebp -quiet -q 72 -m 6                   "$p" -o "${b}-1080.webp"
  sips -s format jpeg -s formatOptions low "$p" --out "${b}-1080.jpg" >/dev/null
  s=$(( $(kb "${b}-512.webp") + $(kb "${b}-768.webp") + $(kb "${b}-1080.webp") ))
  total=$(( total + s ))
  printf '%-46s 512:%4sK 768:%4sK 1080:%4sK  jpg:%4sK\n' "$p" \
    "$(kb "${b}-512.webp")" "$(kb "${b}-768.webp")" "$(kb "${b}-1080.webp")" "$(kb "${b}-1080.jpg")"
done
echo "  webp subtotal: ${total}K"

echo "== hero (add .webp only; .jpg untouched) =="
cwebp -quiet -q 80 imgs/hero-wide.jpg     -o imgs/hero-wide.webp
cwebp -quiet -q 80 imgs/hero-portrait.jpg -o imgs/hero-portrait.webp
printf '  hero-wide.webp %sK   hero-portrait.webp %sK\n' "$(kb imgs/hero-wide.webp)" "$(kb imgs/hero-portrait.webp)"
echo "done."
