---
tags: [foundry-vtt, system-development]
source: https://foundryvtt.com/article/module-sub-types/
confidence: confirmed
---

# Module Subtypes Vanish When the Module Is Disabled

The main operational cost of [[modules-can-contribute-document-subtypes]].

When a module providing a subtype is deactivated:

- Documents of its subtypes become **invalid** and **disappear** from the UI.
- Foundry warns the user before allowing the deactivation.
- Reactivating the module restores visibility and functionality — the data is not destroyed, just unreadable.

The docs recommend modules "provide conversion functionality to convert documents to system-provided sub-types before users disable your module."

**Implication for a ruleset-plugin architecture:** a player's army/roster built under ruleset module X is inert without X installed. That is arguably *correct* semantics for a wargame — a One Page Rules army is meaningless without One Page Rules — but it means:

- Uninstalling a ruleset looks like data loss to a user, even though it isn't.
- Sharing a world requires sharing the ruleset module list.
- The system cannot render a "degraded" view of a foreign unit, because the document isn't there to render.

This is a genuine advantage of the [[generic-type-with-a-ruleset-blob-workaround]], where documents remain valid (if semantically meaningless) with the ruleset absent.

Mitigation: ship a converter, and/or lean on `relationships` in the manifest so Foundry surfaces the dependency.
