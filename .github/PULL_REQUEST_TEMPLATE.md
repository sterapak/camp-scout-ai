## Pull Request Checklist

- [ ] Tests pass (`npm test`)
- [ ] Typecheck passes (`npm run typecheck`)
- [ ] Lint passes (`npm run lint`)
- [ ] Production build succeeds (`npm run build`)
- [ ] No unintended production behavior changes
- [ ] Shared API types updated if request/response contracts changed

Run the full verification script before requesting review:

```bash
./scripts/verify.sh
```
