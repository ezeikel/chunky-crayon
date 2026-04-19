// Re-export from the shared coloring-ui package. Kept here for import
// path stability; the form's sub-components still import from
// `./InputModeContext` locally.
export {
  InputModeProvider,
  useInputMode,
  type InputMode,
  type InputModeState,
  type InputModeActions,
  type InputModeContextValue,
} from "@one-colored-pixel/coloring-ui";
