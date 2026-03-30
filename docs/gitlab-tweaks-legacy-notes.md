# Legacy Notes

The previous Tampermonkey script was recovered from Chrome Tampermonkey storage metadata and source fragments.

Confidently recoverable behaviors:

- Redirecting a GitLab navigation dropdown to `/dashboard/projects?sort=name_asc`
- Rewriting GitLab header links toward issues pages
- Collapsing the right contextual sidebar

Ambiguous fragments from the old script were intentionally not reintroduced without clearer behavior definitions. The goal of this repo is maintainability over preserving brittle one-off DOM hacks.
