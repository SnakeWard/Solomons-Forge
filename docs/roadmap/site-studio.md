# Handoff: Little Revelations Studio Site

Website track for the joint beta. See docs/roadmap/README.md for the release
sequence. This handoff is executed in a new website repository.

## Receiving Actor
- Target: AI coding agent or maintainer with access to a new website
  repository and the Cloudflare account for littlerevelationsstudio.com
- Why this target: static site work with a clear page list and a
  Cloudflare Pages deployment
- Expected role: Builder. Build the site structure and the software pages.
  Studio copy and visual direction come from the maintainer.

## Context
- Project: littlerevelationsstudio.com, hosted on Cloudflare
- Current state: live site focused on Suno music workflows (P.I.M.P.) and a
  co-op: real. Site source in GitHub: planned (none exists). Software
  section: planned. Email routing for security and support addresses:
  unknown.
- Current goal: turn the site into a digital studio home for content and
  software, and give the joint beta a homepage, docs, and contact addresses
- Build environment: a static site generator chosen in step 1, deployed with
  Cloudflare Pages

## Target Outcome
A GitHub repository deploys littlerevelationsstudio.com through Cloudflare
Pages. The site presents Little Revelations Studio as a digital studio
creating content and software, credits Pat Little as founder and creator,
and carries the existing music content under a Content section. The Software
section has pages for Forge, Key, and the extension, with install steps and
the compatibility table. security@ and support@ addresses route to the
maintainer.

## Non-Negotiable Constraints
- Existing music and co-op content is moved, not deleted. Old URLs redirect
  to their new locations.
- No tracking scripts or third-party analytics without the maintainer's
  explicit approval.
- Software pages link to the repositories, and install steps are copied
  from each repository's docs rather than written independently.

## Preservation Map
- Preserve: every existing public page and its content, the domain's DNS
  records other than those this handoff adds, and any existing email setup.
- Do not modify: the P.I.M.P. application repository.

## Required Task Steps
1. Create the repository, SnakeWard/studio-site unless the maintainer names
   another. Choose Astro or plain HTML, and record the reason in its README.
2. Export the current site's pages and assets, and inventory every URL.
3. Build the information architecture: Home (digital studio), Content
   (music, P.I.M.P. workflows, co-op), Software (Forge, Key, extension),
   About (Pat Little, founder and creator), and Contact.
4. Software pages: overview of the two layers, install steps for each part,
   the compatibility table, a beta notice, and links to the Marketplace,
   PyPI, and GitHub.
5. Add a `_redirects` file mapping every old URL to its new location.
6. Connect the repository to Cloudflare Pages with preview deployments for
   pull requests. Switch the production domain only after the maintainer
   approves a preview.
7. Document the Cloudflare steps the maintainer performs: Email Routing for
   security@ and support@, and the DNS TXT record for Marketplace publisher
   domain verification.

## Forbidden Behaviors
- Do not delete or rewrite existing music content without the maintainer's
  approval.
- Do not change DNS, email, or production routing; the maintainer does this.
- Do not make stability or security claims about Forge or Key beyond what
  their own documents state.

## Output Format
The new repository with a preview deployment URL, the URL inventory with its
redirect mapping, and the maintainer's Cloudflare checklist.

## Validation Checklist
- [ ] Every URL in the old inventory returns the page or a redirect to it
  on the preview deployment.
- [ ] Software pages show the same versions as docs/compatibility.md.
- [ ] The site passes an automated accessibility check with no critical
  issues.
- [ ] The preview deployment builds from a clean clone.

## Failure Recovery
If blocked: state what blocked completion, separate confirmed facts from
assumptions, leave the live site untouched, propose the smallest safe next
step, and stop.

## Status Declaration
- Current music and co-op site: real
- Site source repository: planned
- Studio restructure and Software section: planned
- Email routing and publisher domain verification: unknown (maintainer)
