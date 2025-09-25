/*
 * Sandboxed JavaScript/TypeScript runner powered by React + Monaco.
 * The component is authored in TypeScript but transpiled on the fly in the browser
 * via @babel/standalone so we can host it as a single-file demo.
 */

/* global monaco, ts */

// Minimal React type surface so we can author this file without bundler deps.
type ReactStateUpdater<T> = (value: T | ((previous: T) => T)) => void;

type ReactExports = {
  useState<T>(initial: T | (() => T)): [T, ReactStateUpdater<T>];
  useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  useMemo<T>(factory: () => T, deps: unknown[]): T;
  useCallback<T extends (...args: never[]) => unknown>(callback: T, deps: unknown[]): T;
  useRef<T>(initial: T): { current: T };
};

declare const React: ReactExports & { Fragment: unknown };

type ReactDomRoot = { render(children: unknown): void };
declare const ReactDOM: {
  createRoot(container: Element | DocumentFragment | null): ReactDomRoot;
};

declare namespace JSX {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface IntrinsicElements {
    [elementName: string]: any;
  }
  type Element = any;
}

type JSXElement = JSX.Element;
type MutableRefObject<T> = { current: T };

// Monaco surface used by this demo (avoids needing full type package).
interface MonacoEditorInstance {
  dispose(): void;
  getValue(): string;
  setValue(value: string): void;
  updateOptions(options: Record<string, unknown>): void;
  getModel(): MonacoModel | null;
  setModel?(model: MonacoModel | null): void;
  onDidChangeModelContent(listener: () => void): { dispose(): void };
}

interface MonacoModel {
  dispose(): void;
  getValue(): string;
  setValue(value: string): void;
  uri?: unknown;
}

interface MonacoGlobal {
  editor: {
    create(domNode: HTMLElement, options: Record<string, unknown>): MonacoEditorInstance;
    setTheme(theme: string): void;
    setModelLanguage(model: { uri?: unknown }, language: string): void;
    defineTheme?(name: string, data: Record<string, unknown>): void;
    createModel?(value: string, language: string, uri?: unknown): MonacoModel | null;
  };
  languages?: {
    typescript?: {
      typescriptDefaults: {
        setDiagnosticsOptions(options: Record<string, unknown>): void;
        setCompilerOptions(options: Record<string, unknown>): void;
        addExtraLib(source: string, uri?: string): void;
        setEagerModelSync?(value: boolean): void;
      };
    };
    javascript?: {
      javascriptDefaults: {
        setDiagnosticsOptions(options: Record<string, unknown>): void;
        setCompilerOptions?(options: Record<string, unknown>): void;
        setEagerModelSync(value: boolean): void;
      };
    };
  };
  Uri?: {
    parse(value: string): unknown;
  };
}

declare const monaco: MonacoGlobal;
declare const ts: unknown;

type SandboxLanguage = 'javascript' | 'typescript';

type SandboxTheme = 'vs-dark' | 'vs-light';

interface SandboxSettings {
  theme: SandboxTheme;
  fontSize: number;
  autoRun: boolean;
  debounceMs: number;
}

interface SandboxDiagnostics {
  kind: 'error' | 'warning' | 'suggestion';
  message: string;
}

interface ExecutionSummary {
  logs: string[];
  errors: string[];
  runtimeMs: number;
}

const STORAGE_KEYS = {
  language: 'codex:sandbox:language',
  settings: 'codex:sandbox:settings',
  code: (language: SandboxLanguage) => `codex:sandbox:code:${language}`
} as const;

const DEFAULT_SETTINGS: SandboxSettings = {
  theme: 'vs-dark',
  fontSize: 14,
  autoRun: true,
  debounceMs: 600
};

const DEFAULT_SNIPPETS: Record<SandboxLanguage, string> = {
  javascript: `// Try modern JavaScript here. React is available globally.\n// Click \'Run\' or enable auto-run in settings.\n\nconst planets = ['Mercury', 'Venus', 'Earth', 'Mars'];\nconst habitable = planets.filter((planet) => planet.length > 4);\n\nconsole.log('Habitable prospects:', habitable.join(', '));\n`,
  typescript: `// Welcome to the TypeScript sandbox.\n// Feel free to explore typings alongside runtime output.\n\ninterface LaunchWindow {\n  mission: string;\n  durationHours: number;\n  crewCount: number;\n}\n\nconst manifest: LaunchWindow = {\n  mission: 'Aurora',\n  durationHours: 84,\n  crewCount: 4\n};\n\nconsole.log('Mission manifest ready', manifest);\n`
};

const { useState, useEffect, useMemo, useCallback, useRef } = React;

let hasConfiguredMonaco = false;

function configureMonaco(): void {
  if (hasConfiguredMonaco || typeof monaco === 'undefined') return;

  const tsDefaults = monaco.languages?.typescript?.typescriptDefaults;
  const jsDefaults = monaco.languages?.javascript?.javascriptDefaults;

  tsDefaults?.setCompilerOptions({
    allowJs: true,
    target: 99,
    module: 6,
    moduleResolution: 2,
    esModuleInterop: true,
    jsx: 1,
    allowNonTsExtensions: true,
    noEmitOnError: false,
    noUnusedLocals: false,
    noUnusedParameters: false,
    skipLibCheck: true
  });

  tsDefaults?.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false
  });

  tsDefaults?.setEagerModelSync?.(true);

  jsDefaults?.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false
  });
  jsDefaults?.setCompilerOptions?.({
    allowJs: true,
    checkJs: true,
    target: 99,
    module: 6,
    moduleResolution: 2,
    esModuleInterop: true
  });
  jsDefaults?.setEagerModelSync(true);

  hasConfiguredMonaco = true;
}

function useMonacoEditor(
  value: string,
  language: SandboxLanguage,
  fontSize: number,
  theme: SandboxTheme,
  onChange: (code: string) => void
): MutableRefObject<HTMLDivElement | null> {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const externalUpdateRef = useRef(false);
  const changeHandlerRef = useRef(onChange);
  const modelsRef = useRef<{ javascript: MonacoModel | null; typescript: MonacoModel | null }>({
    javascript: null,
    typescript: null
  });

  const getOrCreateModel = useCallback(
    (lang: SandboxLanguage, source: string): MonacoModel | null => {
      if (typeof monaco === 'undefined') return null;
      const existing = modelsRef.current[lang];
      if (existing) {
        if (existing.getValue() !== source) {
          existing.setValue(source);
        }
        return existing;
      }

      const uri = monaco.Uri?.parse?.(
        `inmemory://model/codex-sandbox.${lang === 'typescript' ? 'ts' : 'js'}`
      );
      const model = monaco.editor.createModel
        ? monaco.editor.createModel(source, lang, uri)
        : null;

      if (model) {
        modelsRef.current[lang] = model;
      }

      return model;
    },
    []
  );

  useEffect(() => {
    changeHandlerRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current || typeof monaco === 'undefined') {
      return undefined;
    }

    configureMonaco();

    const initialModel = getOrCreateModel(language, value);

    const editor = monaco.editor.create(containerRef.current, {
      value,
      language,
      theme,
      fontSize,
      automaticLayout: true,
      minimap: { enabled: false },
      scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
      padding: { top: 12, bottom: 12 }
    });

    if (initialModel && editor.setModel) {
      editor.setModel(initialModel);
    }

    editorRef.current = editor;

    const subscription = editor.onDidChangeModelContent(() => {
      if (externalUpdateRef.current) return;
      const handler = changeHandlerRef.current;
      if (handler) {
        handler(editor.getValue());
      }
    });

    return () => {
      subscription?.dispose();
      editor.dispose();
      editorRef.current = null;
      modelsRef.current.javascript?.dispose();
      modelsRef.current.typescript?.dispose();
      modelsRef.current.javascript = null;
      modelsRef.current.typescript = null;
    };
  }, []);

  useEffect(() => {
    if (typeof monaco === 'undefined') return;
    const editor = editorRef.current;
    if (!editor) return;

    const model = getOrCreateModel(language, value);
    if (!model) return;

    const currentModel = editor.getModel();
    if (currentModel !== model && editor.setModel) {
      externalUpdateRef.current = true;
      editor.setModel(model);
      externalUpdateRef.current = false;
    }

    if (model.getValue() !== value) {
      const isActiveModel = editor.getModel() === model;
      if (isActiveModel) {
        externalUpdateRef.current = true;
        model.setValue(value);
        externalUpdateRef.current = false;
      } else {
        model.setValue(value);
      }
    }

    if (monaco.editor.setModelLanguage) {
      monaco.editor.setModelLanguage(model, language);
    }
  }, [getOrCreateModel, language, value]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || typeof monaco === 'undefined') return;
    editor.updateOptions({ fontSize });
    monaco.editor.setTheme(theme);
  }, [fontSize, theme]);

  return containerRef;
}

interface TranspileOutcome {
  code: string;
  diagnostics: SandboxDiagnostics[];
}

function flattenMessage(message: unknown): string {
  if (!message) return 'Unknown issue';
  if (typeof message === 'string') return message;
  if (typeof message === 'object' && 'messageText' in (message as Record<string, unknown>)) {
    return flattenMessage((message as { messageText: unknown }).messageText);
  }
  return String(message);
}

function normalizeDiagnostics(diagnostics: unknown[]): SandboxDiagnostics[] {
  if (!Array.isArray(diagnostics)) return [];

  return diagnostics
    .map((diagnostic) => {
      const data = diagnostic as { category?: number; messageText?: unknown };
      const category = typeof data.category === 'number' ? data.category : 1;
      const message = flattenMessage(data.messageText);

      const kind = category === 0 ? 'warning' : category === 2 ? 'suggestion' : 'error';
      return { kind, message } as SandboxDiagnostics;
    })
    .filter(Boolean);
}

function transpileSource(code: string, language: SandboxLanguage): TranspileOutcome {
  if (typeof ts === 'undefined') {
    return { code, diagnostics: [] };
  }

  const fileName = language === 'typescript' ? 'sandbox.ts' : 'sandbox.js';
  const options = {
    allowJs: true,
    checkJs: language === 'javascript',
    target: (ts as { ScriptTarget: { ES2020: number } }).ScriptTarget?.ES2020 ?? 7,
    module: (ts as { ModuleKind: { ESNext: number } }).ModuleKind?.ESNext ?? 5,
    jsx: (ts as { JsxEmit: { React: number } }).JsxEmit?.React ?? 1,
    jsxFactory: 'React.createElement',
    jsxFragmentFactory: 'React.Fragment',
    esModuleInterop: true,
    isolatedModules: false,
    noUnusedLocals: true,
    noUnusedParameters: true,
    removeComments: false,
    skipLibCheck: true
  };

  const transpile = (ts as { transpileModule?: unknown }).transpileModule as
    | ((source: string, config: { compilerOptions: Record<string, unknown>; reportDiagnostics: boolean; fileName: string }) => {
        outputText: string;
        diagnostics?: unknown[];
      })
    | undefined;

  if (!transpile) {
    return { code, diagnostics: [] };
  }

  const result = transpile(code, {
    compilerOptions: options,
    reportDiagnostics: true,
    fileName
  });

  return {
    code: result.outputText,
    diagnostics: normalizeDiagnostics(result.diagnostics ?? [])
  };
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'function') return value.name ? `[Function: ${value.name}]` : '[Function]';
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
}

function executeCode(compiledCode: string): ExecutionSummary {
  const logs: string[] = [];
  const errors: string[] = [];

  const sandboxConsole = {
    log: (...args: unknown[]) => logs.push(args.map(formatValue).join(' ')),
    info: (...args: unknown[]) => logs.push(args.map(formatValue).join(' ')),
    warn: (...args: unknown[]) => logs.push(`⚠️ ${args.map(formatValue).join(' ')}`),
    error: (...args: unknown[]) => errors.push(args.map(formatValue).join(' '))
  } as Record<string, (...args: unknown[]) => void>;

  const start = performance.now();

  try {
    const runner = new Function('console', 'React', `'use strict';\n${compiledCode}`);
    runner(sandboxConsole, React);
  } catch (error) {
    errors.push(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  }

  const runtimeMs = Math.max(0, Math.round(performance.now() - start));

  return { logs, errors, runtimeMs };
}

function mergeDiagnostics(diagnostics: SandboxDiagnostics[]): SandboxDiagnostics[] {
  const seen = new Set<string>();
  return diagnostics.filter((diagnostic) => {
    const key = `${diagnostic.kind}:${diagnostic.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function usePersistentState<T>(key: string, fallback: T): [T, ReactStateUpdater<T>] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        return JSON.parse(raw) as T;
      }
    } catch (error) {
      console.warn('Failed to read persisted state', error);
    }
    return fallback;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to persist state', error);
    }
  }, [key, state]);

  return [state, setState];
}

function loadCodeFromStorage(language: SandboxLanguage): string {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.code(language));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string') {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Failed to load code snippet', error);
  }
  return DEFAULT_SNIPPETS[language];
}

function persistCode(language: SandboxLanguage, code: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.code(language), JSON.stringify(code));
  } catch (error) {
    console.warn('Failed to persist code snippet', error);
  }
}

const SUGGESTION_HINTS: Array<{ test: (code: string) => boolean; message: string }> = [
  {
    test: (code) => /var\s+\w+/.test(code),
    message: 'Consider replacing `var` with `let` or `const` for predictable scoping.'
  },
  {
    test: (code) => /for\s*\(\s*let\s+\w+\s*=\s*0;\s*\w+\.length;/.test(code),
    message: 'For array traversal, try `.map`, `.forEach`, or `.reduce` for clearer intent.'
  },
  {
    test: (code) => !/console\.log/.test(code),
    message: 'Use `console.log` to surface values in the output console during exploration.'
  }
];

const SETTINGS_OPTIONS: Array<{ label: string; key: keyof SandboxSettings; type: 'checkbox' | 'number' | 'select'; options?: Array<{ label: string; value: SandboxTheme }>; min?: number; max?: number; step?: number }> = [
  {
    label: 'Dark theme',
    key: 'theme',
    type: 'select',
    options: [
      { label: 'Dark', value: 'vs-dark' },
      { label: 'Light', value: 'vs-light' }
    ]
  },
  {
    label: 'Editor font size',
    key: 'fontSize',
    type: 'number',
    min: 10,
    max: 24,
    step: 1
  },
  {
    label: 'Auto run on change',
    key: 'autoRun',
    type: 'checkbox'
  },
  {
    label: 'Auto run debounce (ms)',
    key: 'debounceMs',
    type: 'number',
    min: 200,
    max: 2000,
    step: 50
  }
];

function App(): JSXElement {
  const [language, setLanguage] = usePersistentState<SandboxLanguage>(
    STORAGE_KEYS.language,
    'typescript'
  );
  const [settings, setSettings] = usePersistentState<SandboxSettings>(
    STORAGE_KEYS.settings,
    DEFAULT_SETTINGS
  );
  const [code, setCodeState] = useState<string>(() => loadCodeFromStorage(language));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [summary, setSummary] = useState<ExecutionSummary>({ logs: [], errors: [], runtimeMs: 0 });
  const [diagnostics, setDiagnostics] = useState<SandboxDiagnostics[]>([]);
  const debounceHandle = useRef<number | null>(null);

  useEffect(() => {
    persistCode(language, code);
  }, [language, code]);

  const runSandbox = useCallback(
    (source: string, activeLanguage: SandboxLanguage) => {
      if (debounceHandle.current) {
        window.clearTimeout(debounceHandle.current);
        debounceHandle.current = null;
      }

      const transpiled = transpileSource(source, activeLanguage);
      const suggestions = mergeDiagnostics([
        ...transpiled.diagnostics,
        ...SUGGESTION_HINTS.filter((hint) => hint.test(source)).map((hint) => ({
          kind: 'suggestion' as const,
          message: hint.message
        }))
      ]);

      const execution = executeCode(transpiled.code);

      setDiagnostics(suggestions);
      setSummary(execution);
    },
    []
  );

  const handleEditorChange = useCallback((nextCode: string) => {
    setCodeState(nextCode);
    if (!settings.autoRun) return;
    if (debounceHandle.current) {
      window.clearTimeout(debounceHandle.current);
    }
    debounceHandle.current = window.setTimeout(() => {
      runSandbox(nextCode, language);
    }, settings.debounceMs);
  }, [language, runSandbox, settings.autoRun, settings.debounceMs, setCodeState]);

  const containerRef = useMonacoEditor(
    code,
    language,
    settings.fontSize,
    settings.theme,
    handleEditorChange
  );

  const handleLanguageSelect = useCallback(
    (nextLanguage: SandboxLanguage) => {
      persistCode(language, code);
      setLanguage(nextLanguage);
      setCodeState(loadCodeFromStorage(nextLanguage));
      setSummary({ logs: [], errors: [], runtimeMs: 0 });
      setDiagnostics([]);
    },
    [code, language, setDiagnostics, setLanguage, setCodeState, setSummary]
  );

  const handleRunClick = useCallback(() => {
    runSandbox(code, language);
  }, [code, language, runSandbox]);

  const handleResetClick = useCallback(() => {
    const snippet = DEFAULT_SNIPPETS[language];
    setCodeState(snippet);
    setSummary({ logs: [], errors: [], runtimeMs: 0 });
    setDiagnostics([]);
  }, [language, setCodeState]);

  useEffect(() => () => {
    if (debounceHandle.current) {
      window.clearTimeout(debounceHandle.current);
    }
  }, []);

  const consoleStatus = useMemo(() => {
    if (summary.errors.length) return 'error';
    if (summary.logs.length) return 'success';
    return 'idle';
  }, [summary]);

  return (
    <div className="sandbox">
      <header className="sandbox__toolbar" aria-label="Sandbox controls">
        <div className="toolbar__group">
          <label className="toolbar__label" htmlFor="language-switcher">
            Language
          </label>
          <select
            id="language-switcher"
            className="toolbar__control"
            value={language}
            onChange={(event) => handleLanguageSelect(event.target.value as SandboxLanguage)}
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
          </select>
        </div>

        <div className="toolbar__actions">
          <button type="button" className="toolbar__button" onClick={handleRunClick}>
            ▶ Run
          </button>
          <button type="button" className="toolbar__button" onClick={handleResetClick}>
            ⟲ Reset
          </button>
          <button
            type="button"
            className="toolbar__button"
            onClick={() => setIsSettingsOpen((open) => !open)}
            aria-pressed={isSettingsOpen}
          >
            ⚙ Settings
          </button>
        </div>
      </header>

      <div className="sandbox__panes">
        <section className="sandbox__panel sandbox__panel--editor" aria-label="Code editor">
          <div className="editor" ref={containerRef} />
        </section>

        <section className="sandbox__panel sandbox__panel--console" aria-label="Execution output">
          <header className={`console__header console__header--${consoleStatus}`}>
            <div>
              <h2 className="console__title">Console</h2>
              <p className="console__runtime">Runtime: {summary.runtimeMs}ms</p>
            </div>
            <button type="button" className="toolbar__button" onClick={handleRunClick}>
              Re-run
            </button>
          </header>

          <div className="console__section" role="log" aria-live="polite">
            <h3>Output</h3>
            {summary.logs.length ? (
              <ul className="console__list">
                {summary.logs.map((entry, index) => (
                  <li key={`log-${index}`}>{entry}</li>
                ))}
              </ul>
            ) : (
              <p className="console__empty">No console output yet.</p>
            )}
          </div>

          <div className="console__section" role="alert">
            <h3>Errors</h3>
            {summary.errors.length ? (
              <ul className="console__list console__list--error">
                {summary.errors.map((error, index) => (
                  <li key={`error-${index}`}>{error}</li>
                ))}
              </ul>
            ) : (
              <p className="console__empty">No runtime issues detected.</p>
            )}
          </div>

          <div className="console__section" role="note">
            <h3>Suggestions</h3>
            {diagnostics.length ? (
              <ul className="console__list console__list--suggestion">
                {diagnostics.map((diagnostic, index) => (
                  <li key={`diag-${index}`} data-kind={diagnostic.kind}>
                    {diagnostic.kind === 'warning' ? '⚠️ ' : diagnostic.kind === 'error' ? '⛔ ' : '💡 '}
                    {diagnostic.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="console__empty">Ship shape! No suggestions right now.</p>
            )}
          </div>
        </section>
      </div>

      {isSettingsOpen ? (
        <aside className="sandbox__settings" aria-label="Editor settings">
          <h2 className="settings__title">Environment</h2>
          <form className="settings__form" onSubmit={(event) => event.preventDefault()}>
            {SETTINGS_OPTIONS.map((option) => {
              const value = settings[option.key];
              if (option.type === 'checkbox') {
                return (
                  <label key={option.key} className="settings__field">
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          [option.key]: event.target.checked
                        }))
                      }
                    />
                    {option.label}
                  </label>
                );
              }

              if (option.type === 'select' && option.options) {
                return (
                  <label key={option.key} className="settings__field">
                    <span>{option.label}</span>
                    <select
                      value={value as SandboxTheme}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          [option.key]: event.target.value as SandboxTheme
                        }))
                      }
                    >
                      {option.options.map((entry) => (
                        <option key={entry.value} value={entry.value}>
                          {entry.label}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              }

              return (
                <label key={option.key} className="settings__field">
                  <span>{option.label}</span>
                  <input
                    type="number"
                    value={value as number}
                    min={option.min}
                    max={option.max}
                    step={option.step}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        [option.key]: Number(event.target.value)
                      }))
                    }
                  />
                </label>
              );
            })}
          </form>
        </aside>
      ) : null}
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(<App />);
}
