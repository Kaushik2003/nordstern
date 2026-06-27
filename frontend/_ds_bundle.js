/* @ds-bundle: {"format":3,"namespace":"PhantomDesignSystem_a666e0","components":[{"name":"Button","sourcePath":"components/buttons/Button.jsx"},{"name":"IconButton","sourcePath":"components/buttons/IconButton.jsx"},{"name":"Avatar","sourcePath":"components/data-display/Avatar.jsx"},{"name":"Badge","sourcePath":"components/data-display/Badge.jsx"},{"name":"Card","sourcePath":"components/data-display/Card.jsx"},{"name":"Alert","sourcePath":"components/feedback/Alert.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/buttons/Button.jsx":"17ad1b888024","components/buttons/IconButton.jsx":"215591be6a9f","components/data-display/Avatar.jsx":"989847f596be","components/data-display/Badge.jsx":"87fa3a41c922","components/data-display/Card.jsx":"4b5967ec509d","components/feedback/Alert.jsx":"b7c2e54aa020","components/feedback/Dialog.jsx":"a867c8f1732b","components/forms/Input.jsx":"9ae0f4bf3da4","components/forms/Switch.jsx":"06634dc10a61","components/navigation/Tabs.jsx":"322eb6ffa160","ui_kits/wallet/screens.jsx":"a3983c4cad03","ui_kits/website/sections.jsx":"887911b9bda1"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.PhantomDesignSystem_a666e0 = window.PhantomDesignSystem_a666e0 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/buttons/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Phantom Button — the primary call-to-action primitive.
 * Pill-shaped, friendly, one accent color doing the work.
 */
function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  leadingIcon = null,
  trailingIcon = null,
  style = {},
  children,
  ...props
}) {
  const sizes = {
    sm: {
      padding: "8px 18px",
      fontSize: 13
    },
    md: {
      padding: "12px 28px",
      fontSize: 14
    },
    lg: {
      padding: "16px 34px",
      fontSize: 16
    }
  };
  const variants = {
    primary: {
      background: "var(--color-brand-500)",
      color: "#1A1A1A",
      border: "1.5px solid transparent"
    },
    secondary: {
      background: "transparent",
      color: "var(--color-text-primary)",
      border: "1.5px solid var(--color-border)"
    },
    destructive: {
      background: "var(--color-error)",
      color: "#FFFFFF",
      border: "1.5px solid transparent"
    },
    ghost: {
      background: "transparent",
      color: "var(--color-brand-500)",
      border: "1.5px solid transparent"
    }
  };
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontFamily: "var(--font-display)",
    fontWeight: 600,
    lineHeight: 1,
    borderRadius: "var(--radius-full)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    width: fullWidth ? "100%" : "auto",
    transition: "transform var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard), background var(--duration-fast) var(--ease-standard)",
    WebkitTapHighlightColor: "transparent",
    ...sizes[size],
    ...variants[variant],
    ...style
  };
  const onEnter = e => {
    if (disabled) return;
    e.currentTarget.style.transform = "scale(1.02)";
    if (variant === "primary" || variant === "ghost") e.currentTarget.style.boxShadow = "var(--shadow-glow)";
  };
  const onLeave = e => {
    e.currentTarget.style.transform = "scale(1)";
    e.currentTarget.style.boxShadow = "none";
  };
  const onDown = e => {
    if (disabled) return;
    e.currentTarget.style.transform = "scale(0.97)";
  };
  const onUp = e => {
    if (disabled) return;
    e.currentTarget.style.transform = "scale(1.02)";
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    style: base,
    disabled: disabled,
    onMouseEnter: onEnter,
    onMouseLeave: onLeave,
    onMouseDown: onDown,
    onMouseUp: onUp
  }, props), leadingIcon, children, trailingIcon);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/buttons/Button.jsx", error: String((e && e.message) || e) }); }

// components/buttons/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * IconButton — square/circular button for a single icon.
 * Use in toolbars, nav, card actions.
 */
function IconButton({
  variant = "surface",
  size = "md",
  round = true,
  disabled = false,
  "aria-label": ariaLabel,
  style = {},
  children,
  ...props
}) {
  const sizes = {
    sm: 32,
    md: 40,
    lg: 48
  };
  const dim = sizes[size];
  const variants = {
    surface: {
      background: "var(--color-bg-surface-2)",
      color: "var(--color-text-primary)",
      border: "1px solid var(--color-border)"
    },
    brand: {
      background: "var(--color-brand-500)",
      color: "#1A1A1A",
      border: "1px solid transparent"
    },
    ghost: {
      background: "transparent",
      color: "var(--color-text-secondary)",
      border: "1px solid transparent"
    }
  };
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: dim,
    height: dim,
    borderRadius: round ? "var(--radius-full)" : "var(--radius-md)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    transition: "transform var(--duration-fast) var(--ease-standard), background var(--duration-fast) var(--ease-standard)",
    WebkitTapHighlightColor: "transparent",
    ...variants[variant],
    ...style
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    "aria-label": ariaLabel,
    style: base,
    disabled: disabled,
    onMouseEnter: e => !disabled && (e.currentTarget.style.transform = "scale(1.08)"),
    onMouseLeave: e => e.currentTarget.style.transform = "scale(1)",
    onMouseDown: e => !disabled && (e.currentTarget.style.transform = "scale(0.92)"),
    onMouseUp: e => !disabled && (e.currentTarget.style.transform = "scale(1.08)")
  }, props), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/buttons/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Avatar.jsx
try { (() => {
/**
 * Avatar — circular image or initials with a subtle brand ring.
 */
function Avatar({
  src,
  alt = "",
  initials,
  size = 40,
  ring = true,
  style = {}
}) {
  const base = {
    width: size,
    height: size,
    borderRadius: "var(--radius-full)",
    border: ring ? "1px solid var(--color-border)" : "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    background: "var(--color-brand-900)",
    color: "var(--color-brand-100)",
    fontFamily: "var(--font-display)",
    fontWeight: 600,
    fontSize: Math.round(size * 0.4),
    flexShrink: 0,
    ...style
  };
  return /*#__PURE__*/React.createElement("span", {
    style: base
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: alt,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }) : initials);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Badge — small pill label. Brand by default, or a semantic tone.
 */
function Badge({
  tone = "brand",
  style = {},
  children,
  ...props
}) {
  const tones = {
    brand: {
      bg: "rgba(171, 159, 242, 0.16)",
      fg: "var(--color-brand-500)"
    },
    success: {
      bg: "var(--color-success-fill)",
      fg: "var(--color-success)"
    },
    warning: {
      bg: "var(--color-warning-fill)",
      fg: "var(--color-warning)"
    },
    error: {
      bg: "var(--color-error-fill)",
      fg: "var(--color-error)"
    },
    info: {
      bg: "var(--color-info-fill)",
      fg: "var(--color-info)"
    },
    neutral: {
      bg: "var(--color-bg-surface-2)",
      fg: "var(--color-text-secondary)"
    }
  };
  const t = tones[tone] || tones.brand;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 12px",
      borderRadius: "var(--radius-full)",
      background: t.bg,
      color: t.fg,
      fontFamily: "var(--font-display)",
      fontSize: 14,
      fontWeight: 600,
      lineHeight: "18px",
      whiteSpace: "nowrap",
      ...style
    }
  }, props), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Card — soft, rounded surface. Optionally interactive (lifts on hover).
 */
function Card({
  interactive = false,
  padding = 28,
  style = {},
  children,
  ...props
}) {
  const base = {
    background: "var(--color-bg-surface)",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--color-border)",
    padding,
    boxShadow: "var(--shadow-md)",
    transition: "transform var(--duration-base) var(--ease-standard), box-shadow var(--duration-base) var(--ease-standard)",
    cursor: interactive ? "pointer" : "default",
    ...style
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: base,
    onMouseEnter: e => {
      if (!interactive) return;
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.boxShadow = "var(--shadow-lg)";
    },
    onMouseLeave: e => {
      if (!interactive) return;
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "var(--shadow-md)";
    }
  }, props), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Card.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Alert.jsx
try { (() => {
/**
 * Alert / Toast — left-icon message with a semantic accent border.
 */
function Alert({
  tone = "info",
  title,
  icon = null,
  onClose,
  style = {},
  children
}) {
  const tones = {
    success: {
      fill: "var(--color-success-fill)",
      line: "var(--color-success)"
    },
    warning: {
      fill: "var(--color-warning-fill)",
      line: "var(--color-warning)"
    },
    error: {
      fill: "var(--color-error-fill)",
      line: "var(--color-error)"
    },
    info: {
      fill: "var(--color-info-fill)",
      line: "var(--color-info)"
    }
  };
  const t = tones[tone] || tones.info;
  return /*#__PURE__*/React.createElement("div", {
    role: "alert",
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      padding: "14px 16px",
      background: t.fill,
      borderRadius: "var(--radius-lg)",
      borderLeft: `3px solid ${t.line}`,
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement("span", {
    style: {
      color: t.line,
      display: "inline-flex",
      flexShrink: 0,
      marginTop: 1
    }
  }, icon), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 15,
      color: "var(--color-text-primary)",
      marginBottom: children ? 2 : 0
    }
  }, title), children && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 14,
      lineHeight: "20px",
      color: "var(--color-text-secondary)"
    }
  }, children)), onClose && /*#__PURE__*/React.createElement("button", {
    "aria-label": "Dismiss",
    onClick: onClose,
    style: {
      background: "none",
      border: "none",
      color: "var(--color-text-secondary)",
      cursor: "pointer",
      fontSize: 18,
      lineHeight: 1,
      padding: 0
    }
  }, "\xD7"));
}
Object.assign(__ds_scope, { Alert });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Alert.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
/**
 * Dialog — centered modal with overlay and bouncy enter.
 */
function Dialog({
  open,
  onClose,
  title,
  width = 420,
  style = {},
  children
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "fixed",
      inset: 0,
      background: "var(--overlay)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      zIndex: 1000,
      animation: "phantom-fade var(--duration-base) var(--ease-standard)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    onClick: e => e.stopPropagation(),
    style: {
      width: "100%",
      maxWidth: width,
      background: "var(--color-bg-canvas)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-md)",
      boxShadow: "var(--shadow-lg)",
      padding: 28,
      animation: "phantom-pop var(--duration-base) var(--ease-bounce)",
      ...style
    }
  }, title && /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 16px",
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 22,
      lineHeight: "30px",
      color: "var(--color-text-primary)"
    }
  }, title), children, /*#__PURE__*/React.createElement("style", null, `
          @keyframes phantom-fade { from { opacity: 0 } to { opacity: 1 } }
          @keyframes phantom-pop { from { opacity: 0; transform: scale(0.96) } to { opacity: 1; transform: scale(1) } }
          @media (prefers-reduced-motion: reduce) {
            @keyframes phantom-pop { from { opacity: 0 } to { opacity: 1 } }
          }
        `)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Input — text field with optional label, helper, and error state.
 */
function Input({
  label,
  helperText,
  error = false,
  leadingIcon = null,
  trailingIcon = null,
  id,
  style = {},
  ...props
}) {
  const [focused, setFocused] = React.useState(false);
  const inputId = id || React.useId();
  const wrap = {
    background: "var(--color-bg-surface)",
    border: `1px solid ${error ? "var(--color-error)" : focused ? "var(--color-brand-500)" : "var(--color-border)"}`,
    borderRadius: "var(--radius-md)",
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    boxShadow: focused && !error ? "var(--shadow-glow)" : "none",
    transition: "border var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)"
  };
  const field = {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "var(--color-text-primary)",
    fontFamily: "var(--font-body)",
    fontSize: 15,
    lineHeight: "22px",
    minWidth: 0
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 14,
      fontWeight: 600,
      color: "var(--color-text-primary)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: wrap
  }, leadingIcon, /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    style: field,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false)
  }, props)), trailingIcon), helperText && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      lineHeight: "18px",
      color: error ? "var(--color-error)" : "var(--color-text-secondary)",
      fontFamily: "var(--font-body)"
    }
  }, helperText));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
/**
 * Switch — on/off toggle with a friendly brand-purple track.
 */
function Switch({
  checked = false,
  onChange,
  disabled = false,
  label,
  id,
  style = {}
}) {
  const switchId = id || React.useId();
  const track = {
    width: 44,
    height: 26,
    borderRadius: "var(--radius-full)",
    background: checked ? "var(--color-brand-500)" : "var(--color-border)",
    border: "none",
    padding: 3,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    transition: "background var(--duration-base) var(--ease-standard)",
    display: "inline-flex",
    alignItems: "center",
    flexShrink: 0
  };
  const knob = {
    width: 20,
    height: 20,
    borderRadius: "var(--radius-full)",
    background: "#FFFFFF",
    boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
    transform: checked ? "translateX(18px)" : "translateX(0)",
    transition: "transform var(--duration-base) var(--ease-bounce)"
  };
  const el = /*#__PURE__*/React.createElement("button", {
    id: switchId,
    role: "switch",
    "aria-checked": checked,
    disabled: disabled,
    onClick: () => !disabled && onChange && onChange(!checked),
    style: track
  }, /*#__PURE__*/React.createElement("span", {
    style: knob
  }));
  if (!label) return /*#__PURE__*/React.createElement("span", {
    style: style
  }, el);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
      cursor: "pointer",
      ...style
    }
  }, el, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 15,
      color: "var(--color-text-primary)"
    }
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
/**
 * Tabs — pill-container segmented nav. Active tab gets a brand-tint pill.
 */
function Tabs({
  tabs = [],
  value,
  onChange,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    style: {
      display: "inline-flex",
      gap: 4,
      padding: 4,
      background: "var(--color-bg-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-full)",
      ...style
    }
  }, tabs.map(tab => {
    const key = typeof tab === "string" ? tab : tab.value;
    const label = typeof tab === "string" ? tab : tab.label;
    const active = key === value;
    return /*#__PURE__*/React.createElement("button", {
      key: key,
      role: "tab",
      "aria-selected": active,
      onClick: () => onChange && onChange(key),
      style: {
        padding: "8px 18px",
        borderRadius: "var(--radius-full)",
        border: "none",
        cursor: "pointer",
        fontFamily: "var(--font-display)",
        fontSize: 14,
        fontWeight: 600,
        background: active ? "rgba(171, 159, 242, 0.16)" : "transparent",
        color: active ? "var(--color-brand-500)" : "var(--color-text-secondary)",
        transition: "background var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard)"
      }
    }, label);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/wallet/screens.jsx
try { (() => {
/* Phantom wallet UI kit — screens. Exports to window for index.html. */

const {
  Button,
  IconButton,
  Input,
  Badge,
  Avatar,
  Tabs,
  Switch,
  Card
} = window.PhantomDesignSystem_a666e0;

/* ---------- shared bits ---------- */
function Mono({
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      ...style
    }
  }, children);
}
const TOKENS = [{
  sym: "SOL",
  name: "Solana",
  amt: "12.4002",
  usd: "2,310.18",
  chg: "+2.41%",
  up: true,
  color: "#9945FF"
}, {
  sym: "USDC",
  name: "USD Coin",
  amt: "4,820.00",
  usd: "4,820.00",
  chg: "0.00%",
  up: true,
  color: "#2775CA"
}, {
  sym: "ETH",
  name: "Ethereum",
  amt: "1.204",
  usd: "3,964.55",
  chg: "-0.82%",
  up: false,
  color: "#627EEA"
}, {
  sym: "JTO",
  name: "Jito",
  amt: "318.0",
  usd: "1,272.40",
  chg: "+5.10%",
  up: true,
  color: "#16C784"
}];
function TokenIcon({
  t,
  size = 40
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: size,
      height: size,
      borderRadius: "var(--radius-full)",
      flexShrink: 0,
      background: t.color,
      color: "#fff",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: size * 0.32,
      border: "1px solid var(--color-border)"
    }
  }, t.sym.slice(0, 2));
}

/* ---------- Lock / connect ---------- */
function LockScreen({
  onUnlock
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
      textAlign: "center",
      gap: 8,
      background: "radial-gradient(120% 80% at 50% 0%, #2A2240 0%, var(--color-bg-canvas) 60%)"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-mark.svg",
    width: "84",
    height: "84",
    alt: "Phantom",
    style: {
      animation: "wfloat 5s var(--ease-standard) infinite"
    }
  }), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 28,
      color: "#fff",
      margin: "20px 0 0",
      letterSpacing: "-0.02em"
    }
  }, "Welcome back"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 15,
      color: "var(--color-text-secondary)",
      margin: "4px 0 24px"
    }
  }, "Enter your password to unlock"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      maxWidth: 280
    }
  }, /*#__PURE__*/React.createElement(Input, {
    type: "password",
    placeholder: "Password",
    defaultValue: "\xB7\xB7\xB7\xB7\xB7\xB7\xB7\xB7"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      maxWidth: 280,
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(Button, {
    fullWidth: true,
    onClick: onUnlock
  }, "Unlock")), /*#__PURE__*/React.createElement("button", {
    onClick: onUnlock,
    style: {
      marginTop: 18,
      background: "none",
      border: "none",
      color: "var(--color-brand-500)",
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 14,
      cursor: "pointer"
    }
  }, "Use Face ID"), /*#__PURE__*/React.createElement("style", null, `@keyframes wfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@media(prefers-reduced-motion:reduce){[style*=wfloat]{animation:none!important}}`));
}

/* ---------- Home ---------- */
function HomeScreen({
  onSend,
  onOpenToken
}) {
  const [tab, setTab] = React.useState("tokens");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: "var(--color-bg-canvas)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 18px 8px"
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    initials: "AK",
    size: 36
  }), /*#__PURE__*/React.createElement("button", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "var(--color-bg-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-full)",
      padding: "6px 14px",
      color: "#fff",
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 14,
      cursor: "pointer"
    }
  }, "Account 1 ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--color-text-secondary)"
    }
  }, "\u25BE")), /*#__PURE__*/React.createElement(IconButton, {
    "aria-label": "Scan",
    variant: "surface",
    size: "sm"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "18px 0 8px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 14,
      color: "var(--color-text-secondary)"
    }
  }, "Total balance"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 40,
      fontWeight: 500,
      color: "#fff",
      letterSpacing: "-0.01em",
      marginTop: 4
    }
  }, "$12,367.13"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      display: "inline-flex"
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "success"
  }, "+$284.10 \xB7 2.4%"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      gap: 28,
      padding: "16px 0 20px"
    }
  }, [["Receive", "M12 5v14M5 12l7 7 7-7"], ["Send", "M12 19V5M5 12l7-7 7 7"], ["Swap", "M7 10l5-5 5 5M17 14l-5 5-5-5"], ["Buy", "M12 5v14M5 12h14"]].map(([label, d], i) => /*#__PURE__*/React.createElement("button", {
    key: label,
    onClick: label === "Send" ? onSend : undefined,
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 8,
      background: "none",
      border: "none",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 52,
      height: 52,
      borderRadius: "var(--radius-full)",
      background: "var(--color-bg-surface-2)",
      border: "1px solid var(--color-border)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--color-brand-500)"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: d
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 13,
      color: "#fff"
    }
  }, label)))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 18px 12px"
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    value: tab,
    onChange: setTab,
    tabs: [{
      value: "tokens",
      label: "Tokens"
    }, {
      value: "nfts",
      label: "Collectibles"
    }, {
      value: "activity",
      label: "Activity"
    }]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "0 10px 10px"
    }
  }, tab === "tokens" && TOKENS.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.sym,
    onClick: () => onOpenToken(t),
    style: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 12px",
      background: "none",
      border: "none",
      borderRadius: "var(--radius-md)",
      cursor: "pointer",
      textAlign: "left"
    },
    onMouseEnter: e => e.currentTarget.style.background = "var(--color-bg-surface)",
    onMouseLeave: e => e.currentTarget.style.background = "none"
  }, /*#__PURE__*/React.createElement(TokenIcon, {
    t: t
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 15,
      color: "#fff"
    }
  }, t.name), /*#__PURE__*/React.createElement(Mono, {
    style: {
      fontSize: 13,
      color: "var(--color-text-secondary)"
    }
  }, t.amt, " ", t.sym)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement(Mono, {
    style: {
      fontSize: 15,
      color: "#fff",
      display: "block"
    }
  }, "$", t.usd), /*#__PURE__*/React.createElement(Mono, {
    style: {
      fontSize: 13,
      color: t.up ? "var(--color-success)" : "var(--color-error)"
    }
  }, t.chg)))), tab === "nfts" && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      padding: 8
    }
  }, ["#3120", "#0876", "Mad Lad", "SMB"].map((n, i) => /*#__PURE__*/React.createElement("div", {
    key: n,
    style: {
      borderRadius: "var(--radius-lg)",
      overflow: "hidden",
      border: "1px solid var(--color-border)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 110,
      background: `linear-gradient(135deg, ${["#AB9FF2", "#2EC08B", "#7DB8F2", "#F2B84B"][i]}, var(--color-brand-900))`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "8px 10px",
      background: "var(--color-bg-surface)",
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 13,
      color: "#fff"
    }
  }, n)))), tab === "activity" && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 8
    }
  }, [["Sent SOL", "-2.0 SOL", "2:14 PM"], ["Received USDC", "+500 USDC", "Yesterday"], ["Swapped", "ETH → SOL", "Mon"]].map(([a, b, c]) => /*#__PURE__*/React.createElement("div", {
    key: a,
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 8px",
      borderBottom: "1px solid var(--color-border)"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 14,
      color: "#fff"
    }
  }, a), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 12,
      color: "var(--color-text-secondary)"
    }
  }, c)), /*#__PURE__*/React.createElement(Mono, {
    style: {
      fontSize: 14,
      color: "#fff"
    }
  }, b))))));
}

/* ---------- Send sheet ---------- */
function SendSheet({
  token,
  onClose,
  onConfirm
}) {
  const t = token || TOKENS[0];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      background: "var(--overlay)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end"
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      background: "var(--color-bg-canvas)",
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: "20px 20px 28px",
      animation: "sheetUp var(--duration-base) var(--ease-bounce)",
      borderTop: "1px solid var(--color-border)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 4,
      borderRadius: 999,
      background: "var(--color-border)",
      margin: "0 auto 18px"
    }
  }), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 20,
      color: "#fff",
      margin: "0 0 18px",
      textAlign: "center"
    }
  }, "Send ", t.sym), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "To",
    placeholder: "Address or .sol name",
    defaultValue: "vault.sol"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Amount",
    defaultValue: "2.0",
    helperText: `Available ${t.amt} ${t.sym}`,
    trailingIcon: /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-display)",
        fontWeight: 600,
        fontSize: 13,
        color: "var(--color-brand-500)"
      }
    }, "MAX")
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "16px 4px 18px",
      fontFamily: "var(--font-body)",
      fontSize: 14,
      color: "var(--color-text-secondary)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "Network fee"), /*#__PURE__*/React.createElement(Mono, {
    style: {
      color: "#fff"
    }
  }, "0.000005 SOL")), /*#__PURE__*/React.createElement(Button, {
    fullWidth: true,
    onClick: onConfirm
  }, "Review & send")), /*#__PURE__*/React.createElement("style", null, `@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@media(prefers-reduced-motion:reduce){@keyframes sheetUp{from{opacity:0}to{opacity:1}}}`));
}
Object.assign(window, {
  LockScreen,
  HomeScreen,
  SendSheet,
  TOKENS
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/wallet/screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/sections.jsx
try { (() => {
/* Phantom marketing site UI kit — sections. Exports to window. */
const {
  Button,
  Badge,
  Card,
  Avatar
} = window.PhantomDesignSystem_a666e0;
function Nav() {
  const links = ["Features", "Security", "Developers", "Support"];
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 30,
      backdropFilter: "blur(16px)",
      background: "rgba(26,26,26,0.78)",
      borderBottom: "1px solid var(--color-border)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: "0 auto",
      padding: "14px 24px",
      display: "flex",
      alignItems: "center",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/wordmark.svg",
    alt: "Phantom",
    height: "30"
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      gap: 4,
      marginLeft: 12,
      background: "var(--color-bg-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-full)",
      padding: 4
    }
  }, links.map((l, i) => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      padding: "8px 16px",
      borderRadius: "var(--radius-full)",
      textDecoration: "none",
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 14,
      color: i === 0 ? "var(--color-brand-500)" : "var(--color-text-secondary)",
      background: i === 0 ? "rgba(171,159,242,0.12)" : "transparent"
    }
  }, l))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      display: "flex",
      gap: 12,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm"
  }, "Sign in"), /*#__PURE__*/React.createElement(Button, {
    size: "sm"
  }, "Download"))));
}
function Hero() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: "relative",
      overflow: "hidden",
      textAlign: "center",
      padding: "96px 24px 80px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      background: "radial-gradient(60% 60% at 50% 0%, rgba(171,159,242,0.28) 0%, rgba(60,49,91,0.0) 60%)",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      maxWidth: 860,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "brand"
  }, "\u2728 Now with multi-chain swaps")), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 64,
      lineHeight: "68px",
      letterSpacing: "-0.02em",
      color: "#fff",
      margin: 0
    }
  }, "A crypto wallet that feels", /*#__PURE__*/React.createElement("br", null), "like it's on your side"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 19,
      lineHeight: "28px",
      color: "var(--color-text-secondary)",
      maxWidth: 560,
      margin: "20px auto 32px"
    }
  }, "Manage tokens, NFTs, and swaps across chains \u2014 with the friendly, secure wallet millions already trust."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 14,
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg"
  }, "Download Phantom"), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "secondary"
  }, "See how it works")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 56,
      position: "relative",
      maxWidth: 320,
      margin: "56px auto 0"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-mark.svg",
    width: "120",
    height: "120",
    style: {
      margin: "0 auto",
      display: "block",
      animation: "hfloat 6s var(--ease-standard) infinite"
    },
    alt: ""
  }))), /*#__PURE__*/React.createElement("style", null, `@keyframes hfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@media(prefers-reduced-motion:reduce){@keyframes hfloat{0%,100%{transform:none}}}`));
}
function Features() {
  const feats = [["Send money, simply", "Transfer to any wallet or .sol name in seconds. No jargon, no guesswork.", "M12 19V5M5 12l7-7 7 7"], ["Swap across chains", "Trade tokens on Solana, Ethereum, and more — right inside your wallet.", "M7 10l5-5 5 5M17 14l-5 5-5-5"], ["Secure by default", "Biometric lock, spam detection, and transaction previews on every action.", "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"]];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 1200,
      margin: "0 auto",
      padding: "40px 24px 96px"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 36,
      letterSpacing: "-0.02em",
      color: "#fff",
      textAlign: "center",
      margin: "0 0 8px"
    }
  }, "Everything in one friendly place"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 16,
      color: "var(--color-text-secondary)",
      textAlign: "center",
      margin: "0 0 48px"
    }
  }, "Built so crypto feels approachable, not intimidating."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 24
    }
  }, feats.map(([t, d, icon]) => /*#__PURE__*/React.createElement(Card, {
    key: t,
    interactive: true,
    padding: 32
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 52,
      height: 52,
      borderRadius: "var(--radius-md)",
      background: "rgba(171,159,242,0.16)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--color-brand-500)",
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "26",
    height: "26",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: icon
  }))), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 22,
      color: "#fff",
      margin: "0 0 8px"
    }
  }, t), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 15,
      lineHeight: "23px",
      color: "var(--color-text-secondary)",
      margin: 0
    }
  }, d)))));
}
function CTA() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 1200,
      margin: "0 auto 80px",
      padding: "0 24px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: "var(--radius-xl)",
      background: "linear-gradient(135deg, var(--color-brand-500), var(--color-brand-900))",
      padding: "64px 40px",
      textAlign: "center",
      position: "relative",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 44,
      letterSpacing: "-0.02em",
      color: "#fff",
      margin: "0 0 12px"
    }
  }, "Ready when you are"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 17,
      color: "rgba(255,255,255,0.85)",
      margin: "0 0 28px"
    }
  }, "Free to download. Yours to control."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 14,
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    style: {
      background: "#fff",
      color: "var(--color-brand-900)"
    }
  }, "Download for iOS"), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    style: {
      background: "rgba(0,0,0,0.25)",
      color: "#fff"
    }
  }, "Download for Android"))));
}
function Footer() {
  const cols = {
    Product: ["Download", "Features", "Security"],
    Company: ["About", "Careers", "Blog"],
    Resources: ["Help", "Developers", "Status"]
  };
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      borderTop: "1px solid var(--color-border)",
      padding: "48px 24px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: "2fr 1fr 1fr 1fr",
      gap: 32
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/wordmark.svg",
    alt: "Phantom",
    height: "28"
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 13,
      color: "var(--color-text-secondary)",
      marginTop: 14,
      maxWidth: 240
    }
  }, "The friendly crypto wallet. \xA9 2026.")), Object.entries(cols).map(([h, items]) => /*#__PURE__*/React.createElement("div", {
    key: h
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: 14,
      color: "#fff",
      marginBottom: 14
    }
  }, h), items.map(it => /*#__PURE__*/React.createElement("a", {
    key: it,
    href: "#",
    style: {
      display: "block",
      fontFamily: "var(--font-body)",
      fontSize: 14,
      color: "var(--color-text-secondary)",
      textDecoration: "none",
      marginBottom: 10
    }
  }, it))))));
}
Object.assign(window, {
  Nav,
  Hero,
  Features,
  CTA,
  Footer
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/sections.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Alert = __ds_scope.Alert;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
