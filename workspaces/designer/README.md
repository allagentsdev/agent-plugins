# Designer workspace

A project workspace for interface design, film direction, video editing, motion,
audio review and marketing creative. It composes original publisher skills and
keeps the Video Use editing skill with its upstream helpers.

## Create a workspace

```sh
allagents workspace init ./designer \
  --from allagentsdev/agent-plugins/workspaces/designer
cd designer
printf '\n/sources/video-use/\n' >> .gitignore
allagents plugin list
```

Use AllAgents 1.23.0 or newer, Git and network access. The default `universal`
client installs portable skills into `.agents/skills/`. Clients such as Codex
and Pi can discover that directory. Select other clients with `--client` during
initialization when their own resource directories are needed.

The ignore entry keeps the upstream reference checkout outside project commits.
It appends to an existing `.gitignore`.

The template copies its [Designer guidance](AGENTS.md) into new workspaces while
preserving an existing `AGENTS.md`. In an existing project, incorporate the
relevant guidance into that file yourself. Installation does not start an agent
or create a separate authenticated bot.

## Skill stack

| Source | Purpose |
| --- | --- |
| [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Interface and design-system lead |
| [Remotion](https://github.com/remotion-dev/skills) | Composition, titles, overlays and rendering |
| [Motion Design](https://github.com/LottieFiles/motion-design-skill) | Timing, easing, staging and choreography |
| [DirectorSKILL](https://github.com/wuwangzhang1216/DirectorSKILL) | Story, shot coverage, blocking and continuity |
| [Video Use](https://github.com/browser-use/video-use) | Recorded footage, tutorial editing, transcripts and cut decisions |
| [Hermes songwriting](https://github.com/NousResearch/hermes-agent/tree/main/skills/creative/songwriting-and-ai-music) | Lyrics, song structure and music prompts |
| [Corey Haines marketing skills](https://github.com/coreyhaines31/marketingskills) | Four selected positioning, content, copy and ad skills |
| [Baoyu skills](https://github.com/JimLiu/baoyu-skills) | Infographics and comics |
| [Earshot](https://github.com/Leonxlnx/earshot) | Local audio measurements and model-assisted review |
| [Official GSAP skills](https://github.com/greensock/gsap-skills) | Core, timelines, ScrollTrigger and React |
| [Productivity](../../plugins/productivity) | Write Naturally |

Video Use has a root editing skill and a nested Manim skill. AllAgents' plugin
discovery prefers the nested directory, so this recipe instead clones the
original repository to `sources/video-use/` and points the agent to its root
`SKILL.md`. Its skill and helper bytes stay unchanged. The reference uses
`managed: clone`: AllAgents creates it when missing and does not pull it during
later updates. Review upstream changes before updating that checkout. Keep the
reference checkout and render caches out of your project's Git history.

## Software and accounts

Workspace initialization installs instructions and the Video Use reference. It
does not install media binaries, download audio models, authenticate services or
generate paid content.

| Primitive | Separate setup |
| --- | --- |
| FFmpeg and ffprobe | Install through your operating-system package manager |
| Remotion | Install Node.js and the project's Remotion/React packages; prepare its browser renderer |
| Video Use | Install Python and its declared dependencies; transcription needs ElevenLabs API access |
| GSAP | Install `gsap` and, for React projects, `@gsap/react` in the project |
| Earshot | Install the original CLI/MCP package and download its CLAP/AST models; analysis runs locally on CPU |
| Blender | Install Blender and the [original MCP bridge](https://github.com/ahujasid/mcp-for-blender) if needed; its bridge uses a normal Blender session and can run under Xvfb on Linux |
| Generated footage, music and voice | Configure Higgsfield, Suno and ElevenLabs separately through their official APIs or supported authenticated tools |

Earshot and the Blender bridge currently require different major versions of
Python's MCP package; use separate environments. GSAP requires no AI model.
Earshot's Gemini critique is optional and uploads audio only with consent.
For ElevenLabs API-key use, prefer its maintained official SDK; hosted MCP OAuth
is a separate connection. Keep credentials in private runtime storage and load
them inside the client process. Setup does not authorize paid generation,
transcription or publishing.

## Update

```sh
allagents update
```

This reconciles the declared plugin sources. It does not pull the Video Use
reference or install/update your project's media dependencies. Restart the agent
after skill changes and verify rendered output in the production toolchain.
