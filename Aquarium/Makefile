.PHONY: all wasm capture serve run clean

all: wasm capture

# Build WASM module → web/pkg/
wasm:
	cd wasm && wasm-pack build --target web --out-dir ../web/pkg

# Build native capture daemon
capture:
	cd capture && cargo build --release

PORT ?= 8080

# Serve frontend (no bundler needed)
serve:
	cd web && python3 -m http.server $(PORT)

# Run capture daemon (requires root on macOS)
run-capture:
	sudo ./capture/target/release/aquarium-capture

# Build everything, open browser, start daemon
run: all
	@echo "Open http://localhost:8080 in your browser"
	@cd web && python3 -m http.server 8080 &
	sudo ./capture/target/release/aquarium-capture

clean:
	rm -rf wasm/target capture/target web/pkg
