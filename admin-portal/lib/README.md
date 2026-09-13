# Vendored browser dependency

`supabase.js` is the unmodified UMD build from the workspace's installed `@supabase/supabase-js` version 2.109.0. `SUPABASE-LICENSE` accompanies it. The portal serves it from its own origin rather than downloading executable code from a CDN at runtime. Updating this dependency requires copying a reviewed installed build and rerunning auth/MFA integration checks.
