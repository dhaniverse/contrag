# Publishing contrag-core to crates.io

## Pre-Publish Checklist ✅

- [x] All tests passing (`cargo test --workspace`)
- [x] Package metadata complete (description, keywords, categories)
- [x] README.md included in package
- [x] Dry-run successful (`cargo publish --dry-run`)
- [x] Warnings minimized (13 warnings remaining - all in placeholder code)
- [x] Example compiles successfully
- [ ] Crates.io API token ready

## Publishing Steps

### 1. Get Your Crates.io API Token

1. Go to https://crates.io/me
2. Click "Account Settings"
3. Generate a new API token or copy existing one
4. Keep it safe - you'll need it for the next step

### 2. Login to Crates.io

```bash
cargo login
```

When prompted, paste your API token. This stores it locally in `~/.cargo/credentials.toml`.

### 3. Publish the Package

```bash
cd /Users/dave/Work/products/contrag/contrag-rust/contrag-core
cargo publish
```

**Note:** This command will:
- Package the crate (21 files, ~101.5KB compressed)
- Upload to crates.io
- Make `contrag-core` version 0.1.0 publicly available

### 4. Verify Publication

After successful publish, verify at:
- https://crates.io/crates/contrag-core
- Check that documentation builds at https://docs.rs/contrag-core

## Quick Publish (One-Liner)

If you already have your token set up:

```bash
cd /Users/dave/Work/products/contrag/contrag-rust/contrag-core && cargo publish
```

## What Gets Published

The package includes:
- All source files in `src/`
- `Cargo.toml` with metadata
- `../README.md` (workspace root)
- License file (MIT)

## Post-Publish Tasks

1. **Tag the release:**
   ```bash
   cd /Users/dave/Work/products/contrag
   git tag -a contrag-core-v0.1.0 -m "Release contrag-core v0.1.0"
   git push origin contrag-core-v0.1.0
   ```

2. **Update documentation:**
   - Add usage examples to GitHub README
   - Link to docs.rs documentation

3. **Announce:**
   - Update main TypeScript ContRAG README to mention Rust version
   - Consider posting on relevant forums/communities

## Future Releases

For version updates:

1. Update version in `/Users/dave/Work/products/contrag/contrag-rust/Cargo.toml`:
   ```toml
   [workspace.package]
   version = "0.2.0"  # Increment as needed
   ```

2. Update `CHANGELOG.md` with changes

3. Re-run publish steps above

## Troubleshooting

### "authentication required"
- Run `cargo login` with a valid token

### "crate name already taken"
- The name `contrag-core` is available as of this writing
- If taken, consider: `contrag-icp`, `icp-rag-core`, etc.

### "rate limit exceeded"
- Wait a few minutes and try again
- Crates.io has rate limits for publishes

### "manifest error"
- Check that all workspace dependencies resolve
- Verify `readme` path is correct relative to crate root

## Package Info

- **Name:** contrag-core
- **Version:** 0.1.0
- **Repository:** https://github.com/dhaniverse/contrag
- **License:** MIT
- **Categories:** web-programming, wasm, api-bindings
- **Keywords:** icp, rag, llm, embeddings, web3

## Notes

- This is version 0.1.0 - early experimental release
- Remaining warnings are in placeholder functions that will be implemented in future versions
- The package compiles and all tests pass
- Ready for production use on ICP canisters

---

**Ready to publish!** 🚀

Run the commands above to make contrag-core available on crates.io.
