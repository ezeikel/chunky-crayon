/**
 * Copy/text sanitisers — the React-Native-safe subset.
 *
 * Exposed via the `@one-colored-pixel/coloring-core/copy` subpath so the mobile
 * app (Metro) can import cleanTitle / stripEmDashes etc. WITHOUT pulling the
 * package's root barrel, which re-exports Node-only native deps (sharp, resvg,
 * the AI SDK) that crash the Metro bundle. Same reasoning as the ./gallery and
 * ./scene subpaths.
 *
 * Everything here is pure string functions — zero Node/native deps.
 */

export {
  cleanTitle,
  stripEmDashes,
  stripMarkdown,
  sanitizeCaption,
  NO_EM_DASHES_RULE,
  NO_MARKDOWN_RULE,
} from "../utils/copy";
