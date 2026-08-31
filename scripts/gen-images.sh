#!/usr/bin/env bash
# One-off image derivative generator for the RAT PMC site.
# NOT a build step — run manually after adding/replacing a source photo, then
# commit the derivatives. Needs: cwebp (brew install webp) + sips (macOS).
#
# Sources live in imgs/_originals/<year|misc>/ (git-ignored); derivatives are
# written into imgs/<year>/ (or imgs/ root for the misc set) and committed.
#
# Standard portrait photo -> <base>-{512,768,1080}.webp + <base>-1080.jpg
# Wide "lead" image        -> <base>-{640,1280}.webp + <base>-1280.jpg
set -euo pipefail
cd "$(dirname "$0")/.."
command -v cwebp >/dev/null || { echo "cwebp missing — brew install webp"; exit 1; }

# <year|misc>/<name>.jpg  — source is imgs/_originals/$P, output base is imgs/${P#misc/}
PHOTOS=(
  2023/Me_Behind_Right.jpg 2023/SSLBetter_Right.jpg
  2024/HYG_Right.jpg 2024/Me_CloseUp_right.jpg 2024/Me_Far_Right.jpg
  2024/Ondra_Back_right.jpg 2024/SL_Right.jpg 2024/Seba_reload_right.jpg
  2025/ME_CLIFF_LOOK.jpg 2025/ME_CQB.jpg 2025/Me_Teach_Low.jpg
  2025/Me_Teach_Ondra_Aim.jpg 2025/SEBA_LOOK_UP.jpg
  2025/Whitcher_Trench_Aim_Better_Right.jpg
  2026/cukrak_flag.jpg 2026/darius_aim_walk.jpg 2026/likeminded.jpg
  2026/me_cover_low_ready.jpg 2026/me_hug.jpg
  2026/me_nvg_line_left_stay_lethal_fix.jpg 2026/ondra_lying.jpg
  2026/radar_prone_rock.jpg 2026/radar_solo.jpg
  2026/radon_popelka_stand_stay_lethal.jpg 2026/whitcher_peek.jpg
  2026/whitcher_quarry_stay_lethal_fix.jpg
  misc/SEBA_AIM_BACK.jpg
  misc/Me_train_ondra_aim_cropped_fixed.jpg misc/WHITCHER_TRENCH.jpg
  misc/Seba_Aim_Back_cropped_Fixed.jpg
)

# wide gallery-year lead images (landscape, span the grid)
WIDE=(
  2023/nato-flag-ridge.jpg
  2024/three-operators.jpg
  2025/us-aim-back.jpg
  2026/radon-popelka-wide.jpg
)

kb(){ echo "$(( $(stat -f%z "$1") / 1024 ))"; }

echo "== photos =="
for p in "${PHOTOS[@]}"; do
  src="imgs/_originals/$p"
  [ -f "$src" ] || { echo "MISSING $src"; exit 1; }
  b="imgs/${p#misc/}"; b="${b%.*}"
  mkdir -p "$(dirname "$b")"
  cwebp -quiet -q 70          -resize 512 0 "$src" -o "${b}-512.webp"
  cwebp -quiet -q 68 -m 6     -resize 768 0 "$src" -o "${b}-768.webp"
  cwebp -quiet -q 72 -m 6                   "$src" -o "${b}-1080.webp"
  sips -s format jpeg -s formatOptions low "$src" --out "${b}-1080.jpg" >/dev/null
  printf '%-42s 512:%4sK 768:%4sK 1080:%4sK  jpg:%4sK\n' "$p" \
    "$(kb "${b}-512.webp")" "$(kb "${b}-768.webp")" "$(kb "${b}-1080.webp")" "$(kb "${b}-1080.jpg")"
done

echo "== wide leads =="
for p in "${WIDE[@]}"; do
  src="imgs/_originals/$p"
  [ -f "$src" ] || { echo "MISSING $src"; exit 1; }
  b="imgs/${p%.*}"
  mkdir -p "$(dirname "$b")"
  cwebp -quiet -q 74 -m 6 -resize 640 0                    "$src" -o "${b}-640.webp"
  cwebp -quiet -q 76 -m 6 -resize 1280 0 -resize_mode down_only "$src" -o "${b}-1280.webp"
  sips -Z 1280 -s format jpeg -s formatOptions low "$src" --out "${b}-1280.jpg" >/dev/null
  printf '%-42s 640:%4sK 1280:%4sK  jpg:%4sK\n' "$p" \
    "$(kb "${b}-640.webp")" "$(kb "${b}-1280.webp")" "$(kb "${b}-1280.jpg")"
done

echo "== hero (add .webp only; .jpg untouched) =="
cwebp -quiet -q 80 imgs/hero-wide.jpg     -o imgs/hero-wide.webp
cwebp -quiet -q 80 imgs/hero-portrait.jpg -o imgs/hero-portrait.webp
printf '  hero-wide.webp %sK   hero-portrait.webp %sK\n' "$(kb imgs/hero-wide.webp)" "$(kb imgs/hero-portrait.webp)"
echo "done."
