"""Generate presets/preset-manifest.js from the JSON manifest."""
from pathlib import Path
import json


def main() -> None:
    repo_root = Path(__file__).resolve().parent.parent
    manifest_json = repo_root / "presets" / "preset-manifest.json"
    manifest_js = repo_root / "presets" / "preset-manifest.js"
    manifest = json.loads(manifest_json.read_text(encoding="utf-8"))
    content = "window.builtinPresetManifest = " + json.dumps(manifest, indent=2, ensure_ascii=False) + ";\n"
    manifest_js.write_text(content, encoding="utf-8")


if __name__ == "__main__":
    main()
