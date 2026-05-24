"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, PointerEvent, useCallback, useEffect, useRef, useState } from "react";

type Language = "zh" | "en";
type Module = "character" | "animation" | "editor" | "portfolio";
type StyleTemplate = "none" | "japanese_rpg";
type AuthMode = "login" | "register";
type AssetType = "character" | "item" | "monster" | "scene";
type Direction = "screen_right" | "front" | "back" | "left" | "right";
type BillingPaymentMethod = "card" | "alipay";

type AuthUser = {
  username: string;
  email: string;
  points: number;
};

type PortfolioGeneration = {
  id: string;
  imageUrl: string;
  title: string | null;
  category: AssetType | string;
  description: string | null;
  createdAt: string;
};

type PointPackage = {
  id: string;
  points: number;
  amountCents: number;
  currency: string;
  zhName: string;
  enName: string;
};

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAccounts = {
  accounts?: {
    id?: {
      initialize: (options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        use_fedcm_for_prompt?: boolean;
      }) => void;
      prompt: () => void;
      renderButton: (
        parent: HTMLElement,
        options: {
          theme: "outline" | "filled_blue" | "filled_black";
          size: "large" | "medium" | "small";
          width?: number;
          text?: "signin_with" | "signup_with" | "continue_with" | "signin";
          shape?: "rectangular" | "pill" | "circle" | "square";
        },
      ) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleAccounts;
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

const styleTemplateOptions = [
  {
    id: "japanese_rpg" as const,
    image: "/reference-style/001.png",
    zh: "像素模板",
    en: "Pixel Template",
  },
];

const billingPackageArt: Record<string, { src: string; alt: string }> = {
  starter_30: {
    src: "/billing/coins-stack.png",
    alt: "Pixel coin stack",
  },
  creator_300: {
    src: "/billing/treasure-chest.png",
    alt: "Pixel treasure chest",
  },
  studio_800: {
    src: "/billing/treasure-pile.png",
    alt: "Pixel treasure pile",
  },
};

const landingCharacters = [
  {
    src: "/landing/hero-mage-showcase.png",
    alt: "Pixel mage character",
  },
  {
    src: "/landing/hero-character-2.png",
    alt: "Pixel magic character",
  },
  {
    src: "/landing/hero-character-3.png",
    alt: "Pixel maid character",
  },
];

const directionOptions: Array<{ id: Direction; zh: string; en: string }> = [
  { id: "screen_right", zh: "朝右", en: "Right" },
  { id: "front", zh: "正面", en: "Front" },
  { id: "back", zh: "背面", en: "Back" },
  { id: "left", zh: "朝左", en: "Left" },
];

const outputSizeOptions = [128, 256, 512] as const;
type SpriteAnimation = "idle" | "walk";

function getSpriteOffsets(kind: SpriteAnimation) {
  return kind === "idle"
    ? [
        [0, 0],
        [0, -2],
        [0, 0],
        [0, 1],
      ]
    : [
        [-3, 0],
        [0, -2],
        [3, 0],
        [0, 1],
      ];
}

function drawSpriteFrame(
  context: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  frameSize: number,
  frameIndex: number,
  kind: SpriteAnimation,
  targetX = 0,
) {
  const [x, y] = getSpriteOffsets(kind)[frameIndex];
  context.drawImage(bitmap, targetX + x, y, frameSize, frameSize);
}

const copy = {
  zh: {
    appName: "AI 像素素材工具",
    title: "BAPixel",
    landingTitle: "BAPixel",
    landingSubtitle: "通过描述和参考图生成 RPG 像素角色与游戏素材。",
    landingTagline: "创造你想要的一切。",
    landingEyebrow: "AI 像素素材工具",
    getStart: "开始创作",
    intro: "输入描述或上传参考图，选择方向和尺寸，生成像素 PNG。",
    language: "语言",
    character: "角色",
    editor: "编辑器",
    animation: "动画",
    portfolio: "作品集",
    optional: "可选",
    styleTemplate: "画风模板",
    styleHint: "默认不使用模板。使用模板会额外消耗 2 Point。",
    noTemplate: "默认模板",
    templateExtraCost: "+2 Point",
    referenceExtraCost: "+1 Point",
    label: "角色描述",
    upload: "角色参考图",
    uploadHint: "可选。上传参考图会额外消耗 1 Point。",
    uploadButton: "上传图片",
    removeImage: "移除",
    placeholder: "例如：一个戴着紫色巫师帽的粉色长发女性法师",
    generationSettings: "生成设置",
    direction: "方向",
    outputSize: "导出尺寸",
    styleStrength: "画风强度",
    seed: "Seed",
    randomSeed: "随机",
    generate: "生成图片",
    generating: "生成中...",
    emptyError: "请输入角色描述或上传角色参考图。",
    failedError: "生成失败，请稍后再试。",
    requestError: "请求失败，请确认服务正在运行。",
    loginExpiredError: "登录已过期，请重新登录。",
    rateLimitError: "请求太频繁，请稍后再试。",
    serverConfigError: "服务配置暂不可用，请联系支持。",
    uploadTooLarge: "参考图不能超过 10 MB。",
    info: "这个工具由 Blanche 开发和测试。",
    download: "下载 PNG",
    delete: "删除",
    confirmDeletePortfolioItem: "确定要删除这张作品吗？",
    deletePortfolioFailed: "删除失败，请稍后再试。",
    flipHorizontal: "左右翻转",
    emptyResult: "生成结果会显示在这里",
    animationTitle: "动画模块",
    animationIntro: "这里将用于后续角色动作、帧序列和 sprite sheet 生成。",
    portfolioTitle: "作品集",
    portfolioIntro: "这里会保存你账号下 7 天内生成过的资产；可以命名、下载、删除，或导入编辑器继续调整。",
    emptyPortfolio: "还没有生成历史。",
    portfolioLoginHint: "请先登录查看作品集。",
    loadPortfolioFailed: "加载作品集失败，请稍后再试。",
    login: "登录",
    register: "注册",
    logout: "退出",
    points: "Point",
    recharge: "充值",
    username: "用户名",
    email: "邮箱",
    password: "密码",
    confirmPassword: "确认密码",
    loginTitle: "登录账号",
    registerTitle: "注册账号",
    googleLogin: "使用 Google 登录",
    emailLogin: "邮箱登录",
    createAccount: "创建账号",
    switchToRegister: "没有账号？注册",
    switchToLogin: "已有账号？登录",
    authRequiredFields: "请填写完整信息。",
    passwordMismatch: "两次密码不一致。",
    userExists: "这个邮箱已经注册。",
    invalidLogin: "邮箱或密码不正确。",
    localAuthNote: "账号和 Point 会保存到数据库；Google 登录需要配置 Client ID。",
    pointCost: "消耗 1 Point",
    loginRequired: "请先登录后再生成图片。",
    insufficientPoints: "Point 余额不足，无法生成图片。",
    googleConfigMissing: "请先配置 Google Client ID。",
    googleLoginFailed: "Google 登录失败，请稍后再试。",
    copy: "复制",
    copyPrompt: "复制 Prompt",
    regenerateSimilar: "再次生成相似",
    rename: "命名",
    spritePreview: "动作预览（测试ing）",
    idle: "Idle",
    walk: "Walk",
    exportSpriteSheet: "导出 Sprite",
    exportGif: "导出 GIF",
    editPixels: "在编辑器中编辑",
    pixelEditorTitle: "像素编辑",
    openBlankEditor: "打开空白编辑器",
    importImage: "导入图片",
    editThisImage: "编辑",
    editorTitle: "像素编辑器",
    editorIntro: "从空白画布开始，导入本地图片，或从作品集中选择图片继续编辑。",
    editorEmptyPortfolio: "登录后可以从作品集中选择图片导入编辑器。",
    zoom: "缩放",
    brush: "画笔",
    eraser: "橡皮",
    undo: "撤销",
    saveEdit: "保存到预览",
    copied: "已复制",
    copyImageUnsupported: "当前浏览器不支持复制图片，已复制图片链接。",
    rechargeTitle: "充值 Point",
    rechargeIntro: "选择一个 Point 套餐，付款成功后会自动加入余额。",
    checkout: "去付款",
    checkoutLoading: "正在打开付款页...",
    checkoutFailed: "无法打开付款页，请稍后再试。",
    paymentMethod: "\u652f\u4ed8\u65b9\u5f0f",
    cardPayment: "\u94f6\u884c\u5361",
    alipayPayment: "\u652f\u4ed8\u5b9d",
    packageLoadFailed: "加载套餐失败，请稍后再试。",
    paymentSuccess: "付款成功，Point 已到账。",
    paymentCancel: "付款已取消。",
    close: "关闭",
    legalLinks: "条款 / 隐私 / 退款 / 联系方式",
  },
  en: {
    appName: "AI Pixel Sprite Tool",
    title: "BAPixel",
    landingTitle: "BAPixel",
    landingSubtitle: "Create RPG pixel sprites from prompts and references.",
    landingTagline: "Create anything as you wish.",
    landingEyebrow: "AI PIXEL SPRITE TOOL",
    getStart: "Get Start",
    intro: "Enter a prompt or upload a reference, choose direction and size, then generate a pixel PNG.",
    language: "Language",
    character: "Character",
    editor: "Editor",
    animation: "Animation",
    portfolio: "Portfolio",
    optional: "Optional",
    styleTemplate: "Style Template",
    styleHint: "No template is used by default. Using a template costs 2 extra Points.",
    noTemplate: "No Template",
    templateExtraCost: "+2 Points",
    referenceExtraCost: "+1 Point",
    label: "Character Description",
    upload: "Character Reference",
    uploadHint: "Optional. Uploading a reference image costs 1 extra Point.",
    uploadButton: "Upload Image",
    removeImage: "Remove",
    placeholder: "Example: a female mage with long pink hair wearing a purple wizard hat",
    generationSettings: "Generation Settings",
    direction: "Direction",
    outputSize: "Export Size",
    styleStrength: "Style Strength",
    seed: "Seed",
    randomSeed: "Random",
    generate: "Generate Image",
    generating: "Generating...",
    emptyError: "Please enter a character description or upload a character reference.",
    failedError: "Generation failed. Please try again later.",
    requestError: "Request failed. Please confirm the service is running.",
    loginExpiredError: "Your session expired. Please log in again.",
    rateLimitError: "Too many requests. Please try again later.",
    serverConfigError: "Service configuration is unavailable. Please contact support.",
    uploadTooLarge: "Reference image must be under 10 MB.",
    info: "This tool was developed and tested by Blanche.",
    download: "Download PNG",
    delete: "Delete",
    confirmDeletePortfolioItem: "Delete this portfolio image?",
    deletePortfolioFailed: "Failed to delete image. Please try again later.",
    flipHorizontal: "Flip",
    emptyResult: "Generated result will appear here",
    animationTitle: "Animation Module",
    animationIntro: "This area will be used for character actions, frame sequences, and sprite sheets.",
    portfolioTitle: "Portfolio",
    portfolioIntro: "Generated assets are saved here for 7 days. Name, download, delete, or continue editing them.",
    emptyPortfolio: "No generation history yet.",
    portfolioLoginHint: "Please log in to view your portfolio.",
    loadPortfolioFailed: "Failed to load portfolio. Please try again later.",
    login: "Log In",
    register: "Register",
    logout: "Log Out",
    points: "Point",
    recharge: "Recharge",
    username: "Username",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    loginTitle: "Log In",
    registerTitle: "Create Account",
    googleLogin: "Continue with Google",
    emailLogin: "Log In",
    createAccount: "Create Account",
    switchToRegister: "No account? Register",
    switchToLogin: "Already have an account? Log in",
    authRequiredFields: "Please complete all fields.",
    passwordMismatch: "Passwords do not match.",
    userExists: "This email is already registered.",
    invalidLogin: "Email or password is incorrect.",
    localAuthNote: "Accounts and Points are saved in the database. Google login needs a Client ID.",
    pointCost: "Costs 1 Point",
    loginRequired: "Please log in before generating an image.",
    insufficientPoints: "Not enough Points to generate an image.",
    googleConfigMissing: "Please configure the Google Client ID first.",
    googleLoginFailed: "Google login failed. Please try again later.",
    copy: "Copy",
    copyPrompt: "Copy Prompt",
    regenerateSimilar: "Regenerate Similar",
    rename: "Rename",
    spritePreview: "Animation Preview (Testing)",
    idle: "Idle",
    walk: "Walk",
    exportSpriteSheet: "Export Sprite",
    exportGif: "Export GIF",
    editPixels: "Edit in Pixel Editor",
    pixelEditorTitle: "Pixel Editor",
    openBlankEditor: "Open Blank Editor",
    importImage: "Import Image",
    editThisImage: "Edit",
    editorTitle: "Pixel Editor",
    editorIntro: "Start from a blank canvas, import a local image, or continue editing from your portfolio.",
    editorEmptyPortfolio: "Log in to choose images from your portfolio.",
    zoom: "Zoom",
    brush: "Brush",
    eraser: "Eraser",
    undo: "Undo",
    saveEdit: "Save Preview",
    copied: "Copied",
    copyImageUnsupported: "This browser cannot copy images, so the image link was copied.",
    rechargeTitle: "Recharge Points",
    rechargeIntro: "Choose a Point package. Points are added automatically after payment.",
    checkout: "Checkout",
    checkoutLoading: "Opening checkout...",
    checkoutFailed: "Unable to open checkout. Please try again later.",
    paymentMethod: "Payment Method",
    cardPayment: "Card",
    alipayPayment: "Alipay",
    packageLoadFailed: "Failed to load packages. Please try again later.",
    paymentSuccess: "Payment succeeded. Points have been added.",
    paymentCancel: "Payment was canceled.",
    close: "Close",
    legalLinks: "Terms / Privacy / Refunds / Contact",
  },
};

function getInitialPrompt() {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("prompt")?.slice(0, 500) || "";
}

export default function Home() {
  const initialPrompt = getInitialPrompt();
  const [language, setLanguage] = useState<Language>("zh");
  const [showLanding, setShowLanding] = useState(!initialPrompt);
  const [activeModule, setActiveModule] = useState<Module>("character");
  const [styleTemplate, setStyleTemplate] = useState<StyleTemplate>("none");
  const [direction, setDirection] = useState<Direction>("screen_right");
  const [outputSize, setOutputSize] = useState<128 | 256 | 512>(128);
  const [styleStrength, setStyleStrength] = useState(0.5);
  const [seed, setSeed] = useState("");
  const [description, setDescription] = useState(initialPrompt);
  const [characterReferenceImage, setCharacterReferenceImage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [generationImageApiUrl, setGenerationImageApiUrl] = useState("");
  const [isImageFlipped, setIsImageFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [typedIntro, setTypedIntro] = useState("");
  const [copied, setCopied] = useState(false);
  const [pixelEditorOpen, setPixelEditorOpen] = useState(false);
  const [pixelTool, setPixelTool] = useState<"brush" | "eraser">("brush");
  const [pixelColor, setPixelColor] = useState("#fff2d4");
  const [pixelEditorZoom, setPixelEditorZoom] = useState(4);
  const [pixelUndoStack, setPixelUndoStack] = useState<string[]>([]);
  const [pixelEditorSize, setPixelEditorSize] = useState({ width: 128, height: 128 });
  const [spriteAnimation, setSpriteAnimation] = useState<SpriteAnimation>("idle");
  const [portfolioItems, setPortfolioItems] = useState<PortfolioGeneration[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState("");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authOpen, setAuthOpen] = useState(false);
  const [authError, setAuthError] = useState("");
  const [billingOpen, setBillingOpen] = useState(false);
  const [billingPackages, setBillingPackages] = useState<PointPackage[]>([]);
  const [billingPaymentMethod, setBillingPaymentMethod] = useState<BillingPaymentMethod>("card");
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const generatedImageRef = useRef<HTMLImageElement | null>(null);
  const pixelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pixelImportInputRef = useRef<HTMLInputElement | null>(null);
  const spritePreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const t = copy[language];
  const canGenerate = Boolean(description.trim() || characterReferenceImage);
  const generationCost = 1 + (styleTemplate === "none" ? 0 : 2) + (characterReferenceImage ? 1 : 0);

  const codedError = useCallback((message: string, code: string) => {
    return language === "zh"
      ? `${message} 请联系作者，并附上错误代码：${code}`
      : `${message} Please contact the creator with error code: ${code}`;
  }, [language]);

  const apiErrorCode = useCallback((data: unknown, fallbackCode: string) => {
    if (
      data &&
      typeof data === "object" &&
      "code" in data &&
      typeof (data as { code?: unknown }).code === "string"
    ) {
      return (data as { code: string }).code;
    }

    return fallbackCode;
  }, []);

  async function refreshSession() {
    try {
      const response = await fetch("/api/auth/me");
      const data = await response.json();
      setAuthUser(data.user ?? null);
    } catch {
      setAuthUser(null);
    }
  }

  useEffect(() => {
    async function loadSession() {
      await refreshSession();
    }

    loadSession();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");

    if (!payment) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPaymentMessage(payment === "success" ? t.paymentSuccess : t.paymentCancel);
      refreshSession();
    }, 0);
    window.history.replaceState(null, "", window.location.pathname);

    return () => window.clearTimeout(timer);
  }, [t.paymentCancel, t.paymentSuccess]);

  useEffect(() => {
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTypedIntro(t.intro.slice(0, index));

      if (index >= t.intro.length) {
        window.clearInterval(timer);
      }
    }, 20);

    return () => window.clearInterval(timer);
  }, [t.intro]);

  useEffect(() => {
    if (!authOpen || !GOOGLE_CLIENT_ID) {
      return;
    }

    const initializeGoogleLogin = () => {
      window.google?.accounts?.id?.initialize({
        client_id: GOOGLE_CLIENT_ID,
        use_fedcm_for_prompt: false,
        callback: async (response) => {
          if (!response.credential) {
            setAuthError(codedError(t.googleLoginFailed, "AUTH-GOOGLE-001"));
            return;
          }

          try {
            const result = await fetch("/api/auth/google", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ credential: response.credential }),
            });
            const data = await result.json();

            if (!result.ok || !data.user) {
              setAuthError(codedError(t.googleLoginFailed, apiErrorCode(data, "AUTH-GOOGLE-002")));
              return;
            }

            saveSession(data.user as AuthUser);
            setAuthOpen(false);
          } catch {
            setAuthError(codedError(t.googleLoginFailed, "AUTH-GOOGLE-003"));
          }
        },
      });

      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = "";
        window.google?.accounts?.id?.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          width: 406,
          text: "signin_with",
          shape: "rectangular",
        });
      }
    };

    if (window.google?.accounts?.id) {
      initializeGoogleLogin();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", initializeGoogleLogin, { once: true });
      return () => existingScript.removeEventListener("load", initializeGoogleLogin);
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", initializeGoogleLogin, { once: true });
    document.head.appendChild(script);

    return () => script.removeEventListener("load", initializeGoogleLogin);
  }, [apiErrorCode, authOpen, codedError, t.googleLoginFailed]);

  useEffect(() => {
    if (activeModule !== "portfolio" && activeModule !== "editor") {
      return;
    }

    async function loadPortfolio() {
      if (!authUser) {
        setPortfolioItems([]);
        setPortfolioError(t.portfolioLoginHint);
        return;
      }

      setPortfolioLoading(true);
      setPortfolioError("");

      try {
        const response = await fetch("/api/portfolio");
        const data = await response.json();

        if (!response.ok) {
          setPortfolioError(codedError(t.loadPortfolioFailed, apiErrorCode(data, "PORT-LOAD-001")));
          setPortfolioItems([]);
          return;
        }

        setPortfolioItems(data.generations ?? []);
      } catch {
        setPortfolioError(codedError(t.loadPortfolioFailed, "PORT-LOAD-002"));
        setPortfolioItems([]);
      } finally {
        setPortfolioLoading(false);
      }
    }

    loadPortfolio();
  }, [activeModule, apiErrorCode, authUser, codedError, t.loadPortfolioFailed, t.portfolioLoginHint]);

  useEffect(() => {
    if (!billingOpen || billingPackages.length > 0) {
      return;
    }

    async function loadPackages() {
      setBillingLoading(true);
      setBillingError("");

      try {
        const response = await fetch("/api/billing/packages");
        const data = await response.json();

        if (!response.ok) {
          setBillingError(codedError(t.packageLoadFailed, apiErrorCode(data, "BILL-PACK-001")));
          return;
        }

        setBillingPackages(data.packages ?? []);
      } catch {
        setBillingError(codedError(t.packageLoadFailed, "BILL-PACK-002"));
      } finally {
        setBillingLoading(false);
      }
    }

    loadPackages();
  }, [apiErrorCode, billingOpen, billingPackages.length, codedError, t.packageLoadFailed]);

  useEffect(() => {
    if (!imageUrl) {
      return;
    }

    let cancelled = false;
    let timer: number | undefined;
    let bitmap: ImageBitmap | null = null;

    async function renderSpritePreview() {
      try {
        const response = await fetch(generationImageApiUrl || imageUrl);
        const blob = await response.blob();
        bitmap = await createImageBitmap(blob);
        const frameSize = Math.max(bitmap.width, bitmap.height);
        const canvas = spritePreviewCanvasRef.current;
        const context = canvas?.getContext("2d");

        if (!canvas || !context || cancelled) {
          bitmap.close();
          bitmap = null;
          return;
        }

        canvas.width = frameSize;
        canvas.height = frameSize;
        context.imageSmoothingEnabled = false;
        let frame = 0;

        const draw = () => {
          if (!context || !bitmap) {
            return;
          }

          context.clearRect(0, 0, frameSize, frameSize);
          if (isImageFlipped) {
            context.save();
            context.translate(frameSize, 0);
            context.scale(-1, 1);
            drawSpriteFrame(context, bitmap, frameSize, frame, spriteAnimation);
            context.restore();
          } else {
            drawSpriteFrame(context, bitmap, frameSize, frame, spriteAnimation);
          }
          frame = (frame + 1) % 4;
        };

        draw();
        timer = window.setInterval(draw, 130);
      } catch {
        // Preview is optional; export/download still works if this fails.
      }
    }

    renderSpritePreview();

    return () => {
      cancelled = true;
      if (timer) {
        window.clearInterval(timer);
      }
      bitmap?.close();
    };
  }, [generationImageApiUrl, imageUrl, isImageFlipped, spriteAnimation]);

  function openAuth(mode: AuthMode) {
    setAuthMode(mode);
    setAuthOpen(true);
    setAuthError("");
    setUsername("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  }

  function saveSession(user: AuthUser) {
    setAuthUser(user);
  }

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });
    setAuthUser(null);
  }

  function openBilling() {
    if (!authUser) {
      openAuth("login");
      return;
    }

    setBillingOpen(true);
    setBillingError("");
  }

  async function startCheckout(packageId: string) {
    setBillingLoading(true);
    setBillingError("");

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ packageId, paymentMethod: billingPaymentMethod }),
      });
      const data = await response.json();

      if (!response.ok || !data.url) {
        setBillingError(codedError(t.checkoutFailed, apiErrorCode(data, "BILL-CHECKOUT-001")));
        return;
      }

      window.location.href = data.url;
    } catch {
      setBillingError(codedError(t.checkoutFailed, "BILL-CHECKOUT-002"));
    } finally {
      setBillingLoading(false);
    }
  }

  function handleGoogleLogin() {
    if (!GOOGLE_CLIENT_ID) {
      setAuthError(codedError(t.googleConfigMissing, "AUTH-GOOGLE-004"));
      return;
    }

    if (!window.google?.accounts?.id) {
      setAuthError(codedError(t.googleLoginFailed, "AUTH-GOOGLE-005"));
      return;
    }

    window.google.accounts.id.prompt();
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedUsername = username.trim();

    if (authMode === "register") {
      if (!trimmedUsername || !normalizedEmail || !password || !confirmPassword) {
        setAuthError(t.authRequiredFields);
        return;
      }

      if (password !== confirmPassword) {
        setAuthError(t.passwordMismatch);
        return;
      }

      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: trimmedUsername,
            email: normalizedEmail,
            password,
          }),
        });
        const data = await response.json();

        if (!response.ok || !data.user) {
          setAuthError(codedError(t.userExists, apiErrorCode(data, "AUTH-REGISTER-001")));
          return;
        }

        saveSession(data.user as AuthUser);
        setAuthOpen(false);
      } catch {
        setAuthError(codedError(t.requestError, "AUTH-REGISTER-002"));
      }
      return;
    }

    if (!normalizedEmail || !password) {
      setAuthError(t.authRequiredFields);
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.user) {
        setAuthError(codedError(t.invalidLogin, apiErrorCode(data, "AUTH-LOGIN-001")));
        return;
      }

      saveSession(data.user as AuthUser);
      setAuthOpen(false);
    } catch {
      setAuthError(codedError(t.requestError, "AUTH-LOGIN-002"));
    }
  }

  async function handleReferenceUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(t.uploadTooLarge);
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCharacterReferenceImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  async function generateCharacter() {
    const trimmedDescription = description.trim();

    if (!trimmedDescription && !characterReferenceImage) {
      setError(t.emptyError);
      return;
    }

    if (!authUser) {
      setError(t.loginRequired);
      openAuth("login");
      return;
    }

    if (authUser.points < generationCost) {
      setError(t.insufficientPoints);
      return;
    }

    setLoading(true);
    setError("");
    setImageUrl("");
    setGenerationImageApiUrl("");
    setIsImageFlipped(false);
    setCopied(false);

    try {
      const response = await fetch("/api/generate-character", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: trimmedDescription,
          styleTemplate,
          characterReferenceImage: characterReferenceImage || null,
          assetType: "character",
          direction,
          outputSize,
          backgroundMode: "transparent",
          styleStrength,
          seed: seed.trim() ? Number(seed) : null,
        }),
      });

      const data = await response.json();

      if (response.status === 202 && data.job?.id) {
        await pollGenerationJob(String(data.job.id));
        return;
      }

      if (!response.ok) {
        if (response.status === 401) {
          setError(codedError(t.loginExpiredError, apiErrorCode(data, "GEN-401")));
          setAuthUser(null);
          openAuth("login");
        } else if (response.status === 402) {
          setError(codedError(t.insufficientPoints, apiErrorCode(data, "GEN-402")));
        } else if (response.status === 413) {
          setError(codedError(t.uploadTooLarge, apiErrorCode(data, "GEN-413")));
        } else if (response.status === 429) {
          setError(codedError(t.rateLimitError, apiErrorCode(data, "GEN-429")));
        } else if (response.status === 409) {
          setError(codedError(language === "zh" ? "\u5df2\u6709\u751f\u6210\u4efb\u52a1\u6b63\u5728\u8fdb\u884c\uff0c\u8bf7\u7a0d\u7b49\u3002" : "A generation is already running. Please wait.", apiErrorCode(data, "GEN-409")));
        } else if (response.status >= 500) {
          setError(codedError(t.serverConfigError, apiErrorCode(data, "GEN-500")));
        } else {
          setError(codedError(t.failedError, apiErrorCode(data, "GEN-400")));
        }
        return;
      }

      setImageUrl(data.imageUrl);
      setGenerationImageApiUrl(data.generation?.id ? `/api/generation-image?id=${encodeURIComponent(data.generation.id)}` : "");
      if (data.user) {
        saveSession(data.user as AuthUser);
      }
      if (data.generation) {
        setPortfolioItems((items) => [data.generation as PortfolioGeneration, ...items]);
      }
    } catch {
      setError(codedError(t.requestError, "GEN-NETWORK"));
    } finally {
      setLoading(false);
    }
  }

  async function copyGeneratedImage() {
    if (!imageUrl) {
      return;
    }

    const absoluteUrl = new URL(generationImageApiUrl || imageUrl, window.location.origin).toString();

    try {
      const blob = await getDisplayedImageBlob();

      if ("ClipboardItem" in window && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type || "image/png"]: blob,
          }),
        ]);
      } else {
        setError(t.copyImageUnsupported);
        await navigator.clipboard.writeText(absoluteUrl);
      }

      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    }
  }

  async function pollGenerationJob(jobId: string) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < 900000) {
      await new Promise((resolve) => window.setTimeout(resolve, 3000));

      const response = await fetch(`/api/generation-job?id=${encodeURIComponent(jobId)}`);
      const data = await response.json();

      if (response.status === 202 || data.job?.status === "PENDING" || data.job?.status === "RUNNING") {
        continue;
      }

      if (!response.ok) {
        if (response.status === 401) {
          setError(codedError(t.loginExpiredError, apiErrorCode(data, "JOB-401")));
          setAuthUser(null);
          openAuth("login");
        } else if (response.status === 402) {
          setError(codedError(t.insufficientPoints, apiErrorCode(data, "JOB-402")));
        } else {
          setError(codedError(t.failedError, apiErrorCode(data, "JOB-500")));
        }
        return;
      }

      setImageUrl(data.imageUrl);
      setGenerationImageApiUrl(data.generation?.id ? `/api/generation-image?id=${encodeURIComponent(data.generation.id)}` : "");
      if (data.user) {
        saveSession(data.user as AuthUser);
      }
      if (data.generation) {
        setPortfolioItems((items) => [data.generation as PortfolioGeneration, ...items]);
      }
      return;
    }

    setError(codedError(language === "zh" ? "\u751f\u6210\u4ecd\u5728\u8fdb\u884c\uff0c\u8bf7\u7a0d\u540e\u5230\u4f5c\u54c1\u96c6\u67e5\u770b\u3002" : "Generation is still running. Please check the portfolio later.", "JOB-TIMEOUT"));
  }

  async function getDisplayedImageBlob() {
    const response = await fetch(generationImageApiUrl || imageUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const context = canvas.getContext("2d");

    if (!context) {
      bitmap.close();
      throw new Error("Canvas is unavailable.");
    }

    context.imageSmoothingEnabled = false;

    if (isImageFlipped) {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }

    context.drawImage(bitmap, 0, 0);
    bitmap.close();

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Unable to export image."));
        }
      }, "image/png");
    });
  }

  async function downloadDisplayedImage() {
    if (!imageUrl) {
      return;
    }

    try {
      const blob = await getDisplayedImageBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = isImageFlipped ? "pixel-character-flipped.png" : "pixel-character.png";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      const link = document.createElement("a");
      link.href = generationImageApiUrl || imageUrl;
      link.download = "pixel-character.png";
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  }

  async function createSpriteSheetBlob(kind: SpriteAnimation) {
    const blob = await getDisplayedImageBlob();
    const bitmap = await createImageBitmap(blob);
    const frameSize = Math.max(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = frameSize * 4;
    canvas.height = frameSize;
    const context = canvas.getContext("2d");

    if (!context) {
      bitmap.close();
      throw new Error("Canvas is unavailable.");
    }

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, canvas.width, canvas.height);

    for (let index = 0; index < 4; index += 1) {
      drawSpriteFrame(context, bitmap, frameSize, index, kind, index * frameSize);
    }

    bitmap.close();

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((sheetBlob) => {
        if (sheetBlob) {
          resolve(sheetBlob);
        } else {
          reject(new Error("Unable to export sprite sheet."));
        }
      }, "image/png");
    });
  }

  async function exportSpriteSheet(kind: SpriteAnimation) {
    if (!imageUrl) {
      return;
    }

    try {
      const sheetBlob = await createSpriteSheetBlob(kind);
      const url = URL.createObjectURL(sheetBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pixel-${kind}-sheet.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(codedError(t.failedError, "EXPORT-SPRITE-001"));
    }
  }

  async function exportSpriteGif(kind: SpriteAnimation) {
    if (!imageUrl) {
      return;
    }

    try {
      const [{ GIFEncoder, quantize, applyPalette }, blob] = await Promise.all([
        import("gifenc"),
        getDisplayedImageBlob(),
      ]);
      const bitmap = await createImageBitmap(blob);
      const frameSize = Math.max(bitmap.width, bitmap.height);
      const gif = GIFEncoder();
      const frameCanvas = document.createElement("canvas");
      frameCanvas.width = frameSize;
      frameCanvas.height = frameSize;
      const frameContext = frameCanvas.getContext("2d", { willReadFrequently: true });

      if (!frameContext) {
        bitmap.close();
        throw new Error("Canvas is unavailable.");
      }

      frameContext.imageSmoothingEnabled = false;
      for (let index = 0; index < 4; index += 1) {
        frameContext.clearRect(0, 0, frameSize, frameSize);
        drawSpriteFrame(frameContext, bitmap, frameSize, index, kind);
        const rgba = frameContext.getImageData(0, 0, frameSize, frameSize).data;
        const palette = quantize(rgba, 256);
        const indexed = applyPalette(rgba, palette);
        gif.writeFrame(indexed, frameSize, frameSize, {
          palette,
          delay: 130,
          transparent: true,
        });
      }
      bitmap.close();
      gif.finish();

      const gifBytes = gif.bytes();
      const gifBuffer = new ArrayBuffer(gifBytes.byteLength);
      new Uint8Array(gifBuffer).set(gifBytes);
      const gifBlob = new Blob([gifBuffer], { type: "image/gif" });
      const url = URL.createObjectURL(gifBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pixel-${kind}.gif`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(codedError(t.failedError, "EXPORT-GIF-001"));
    }
  }

  async function preparePixelEditor(
    draw: (canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) => Promise<void> | void,
  ) {
    setActiveModule("editor");
    setPixelEditorOpen(true);
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    const canvas = pixelCanvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    context.imageSmoothingEnabled = false;
    await draw(canvas, context);
    setPixelEditorSize({ width: canvas.width, height: canvas.height });
    setPixelUndoStack([]);
  }

  async function drawBlobInPixelEditor(blob: Blob) {
    const bitmap = await createImageBitmap(blob);

    try {
      await preparePixelEditor((canvas, context) => {
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0);
      });
    } finally {
      bitmap.close();
    }
  }

  async function openBlankPixelEditor() {
    await preparePixelEditor((canvas, context) => {
      canvas.width = outputSize;
      canvas.height = outputSize;
      context.clearRect(0, 0, canvas.width, canvas.height);
    });
  }

  async function openPixelEditor() {
    if (!imageUrl) {
      await openBlankPixelEditor();
      return;
    }

    try {
      const blob = await getDisplayedImageBlob();
      await drawBlobInPixelEditor(blob);
    } catch {
      setError(codedError(t.failedError, "EDITOR-OPEN-001"));
    }
  }

  async function importImageToPixelEditor(file: File) {
    try {
      await drawBlobInPixelEditor(file);
    } catch {
      setError(codedError(t.failedError, "EDITOR-IMPORT-001"));
    }
  }

  async function handlePixelEditorImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError(codedError(t.failedError, "EDITOR-IMPORT-002"));
      return;
    }

    await importImageToPixelEditor(file);
  }

  async function openPortfolioImageInEditor(item: PortfolioGeneration) {
    try {
      setPortfolioError("");
      const response = await fetch(`/api/generation-image?id=${encodeURIComponent(item.id)}`);

      if (!response.ok) {
        throw new Error("Failed to load portfolio image.");
      }

      await drawBlobInPixelEditor(await response.blob());
    } catch {
      setPortfolioError(codedError(t.loadPortfolioFailed, "EDITOR-PORT-001"));
    }
  }

  function drawPixel(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = pixelCanvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context || event.buttons !== 1) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * canvas.height);

    context.imageSmoothingEnabled = false;
    if (pixelTool === "eraser") {
      context.clearRect(x, y, 1, 1);
    } else {
      context.fillStyle = pixelColor;
      context.fillRect(x, y, 1, 1);
    }
  }

  function beginPixelStroke(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = pixelCanvasRef.current;

    if (canvas) {
      setPixelUndoStack((stack) => [...stack.slice(-9), canvas.toDataURL("image/png")]);
    }

    drawPixel(event);
  }

  function undoPixelEdit() {
    const previous = pixelUndoStack.at(-1);
    const canvas = pixelCanvasRef.current;
    const context = canvas?.getContext("2d");

    if (!previous || !canvas || !context) {
      return;
    }

    const image = new window.Image();
    image.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      setPixelUndoStack((stack) => stack.slice(0, -1));
    };
    image.src = previous;
  }

  function savePixelEditToPreview() {
    const canvas = pixelCanvasRef.current;

    if (!canvas) {
      return;
    }

    setImageUrl(canvas.toDataURL("image/png"));
    setGenerationImageApiUrl("");
  }

  async function updatePortfolioItem(
    generationId: string,
    changes: Partial<Pick<PortfolioGeneration, "title" | "category">>,
  ) {
    const previousItems = portfolioItems;
    setPortfolioItems((items) =>
      items.map((item) => (item.id === generationId ? { ...item, ...changes } : item)),
    );

    try {
      const response = await fetch("/api/portfolio", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ generationId, ...changes }),
      });
      const data = await response.json();

      if (!response.ok || !data.generation) {
        throw new Error("Failed to update portfolio item.");
      }

      setPortfolioItems((items) =>
        items.map((item) => (item.id === generationId ? data.generation : item)),
      );
    } catch {
      setPortfolioItems(previousItems);
      setPortfolioError(codedError(t.loadPortfolioFailed, "PORT-UPDATE-001"));
    }
  }

  async function removeBrokenPortfolioImage(generationId: string) {
    setPortfolioItems((items) => items.filter((item) => item.id !== generationId));

    try {
      await fetch("/api/portfolio", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ generationId }),
      });
    } catch {
      // The broken image is already hidden locally; the next portfolio load will retry cleanup.
    }
  }

  async function deletePortfolioImage(generationId: string) {
    if (!window.confirm(t.confirmDeletePortfolioItem)) {
      return;
    }

    const previousItems = portfolioItems;
    setPortfolioError("");
    setPortfolioItems((items) => items.filter((item) => item.id !== generationId));

    try {
      const response = await fetch("/api/portfolio", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ generationId }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete portfolio image.");
      }
    } catch {
      setPortfolioItems(previousItems);
      setPortfolioError(codedError(t.deletePortfolioFailed, "PORT-DELETE-001"));
    }
  }

  if (showLanding) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#030712] text-[#fafafa]">
        <nav className="relative z-20 border-b border-[#2a3142] bg-[#111827] text-[#d9deea] shadow-[0_8px_28px_rgba(0,0,0,0.35)]">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-4 sm:px-8 lg:px-10 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f0b84f]">
                  {t.appName}
                </p>
                <h1 className="text-2xl font-bold tracking-normal text-[#fafafa]">
                  {t.title}
                </h1>
              </div>

              <div className="flex rounded-lg border border-[#2a3142] bg-[#080b13] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModule("character");
                    setShowLanding(false);
                  }}
                  className="h-9 rounded-md bg-[#d99a2b] px-4 text-sm font-semibold text-[#18181b] transition"
                >
                  {t.character}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveModule("portfolio");
                    setShowLanding(false);
                  }}
                  className="h-9 rounded-md px-4 text-sm font-semibold text-[#d9deea] transition hover:bg-[#20283a]"
                >
                  {t.portfolio}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveModule("editor");
                    setShowLanding(false);
                    void openBlankPixelEditor();
                  }}
                  className="h-9 rounded-md px-4 text-sm font-semibold text-[#d9deea] transition hover:bg-[#20283a]"
                >
                  {t.editor}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              {authUser ? (
                <div className="flex items-center gap-2">
                  <div className="flex h-10 items-center gap-2 rounded-full border border-[#2a3142] bg-[#111827] px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <span className="rounded-full border border-[#d99a2b] bg-[#211a12] px-2 py-1 text-[10px] font-bold uppercase text-[#f0b84f]">
                      {t.points}
                    </span>
                    <span className="text-sm font-bold text-[#f0b84f]">
                      {authUser.points}
                    </span>
                    <span className="h-4 w-px bg-[#27272a]" />
                    <button
                      type="button"
                      onClick={openBilling}
                      className="rounded-full px-2 py-1 text-xs font-bold text-[#fafafa] transition hover:bg-[#3a1f2b] hover:text-[#f0b84f]"
                    >
                      {t.recharge}
                    </button>
                  </div>
                  <div className="flex h-12 items-center gap-3 rounded-lg border border-[#2a3142] bg-[#080b13] px-3">
                    <p className="max-w-32 truncate text-sm font-semibold text-[#fafafa]">
                      {authUser.username}
                    </p>
                    <button
                      type="button"
                      onClick={logout}
                      className="rounded-md border border-[#2a3142] px-2 py-1 text-xs font-semibold text-[#d9deea] transition hover:border-[#d99a2b]"
                    >
                      {t.logout}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openAuth("login")}
                    className="h-10 rounded-lg border border-[#2a3142] bg-[#080b13] px-4 text-sm font-semibold text-[#fafafa] transition hover:border-[#2dd4bf]"
                  >
                    {t.login}
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuth("register")}
                    className="h-10 rounded-lg bg-[#9f2f2b] px-4 text-sm font-bold text-[#fafafa] transition hover:bg-[#b83a35]"
                  >
                    {t.register}
                  </button>
                </div>
              )}

              <label className="flex h-10 items-center gap-2 rounded-lg border border-[#2a3142] bg-[#080b13] px-3 text-sm text-[#d4d4d8] xl:absolute xl:right-8 xl:top-4">
                <span>{t.language}</span>
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as Language)}
                  className="h-8 rounded-md border border-[#2a3142] bg-[#111827] px-2 text-sm font-semibold text-[#fafafa] outline-none transition focus:border-[#2dd4bf]"
                >
                  <option value="zh">{"\u4e2d\u6587"}</option>
                  <option value="en">English</option>
                </select>
              </label>
            </div>
          </div>
        </nav>

        <Image
          src="/landing/pixel-map-bg.jpg"
          alt="Pixel fantasy map background"
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ imageRendering: "pixelated" }}
        />
        <div className="landing-mask-fade absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0.68)_25%,rgba(0,0,0,0.34)_54%,rgba(0,0,0,0.56)_100%)]" />
        <div className="landing-mask-fade absolute inset-0 bg-[radial-gradient(circle_at_62%_36%,rgba(255,221,141,0.14),transparent_34%),linear-gradient(180deg,rgba(0,0,0,0.24)_0%,rgba(0,0,0,0.06)_42%,rgba(0,0,0,0.78)_100%)]" />

        <section className="relative z-10 grid min-h-[calc(100vh-81px)] grid-cols-1 lg:grid-cols-[280px_1fr]">
          <aside className="border-b border-white/10 bg-black/72 px-6 py-8 shadow-[20px_0_60px_rgba(0,0,0,0.42)] backdrop-blur-sm lg:border-b-0 lg:border-r lg:px-6">
            <p className="text-xs font-bold tracking-[0.26em] text-[#f0b84f]">
              {t.landingEyebrow}
            </p>
            <div className="mt-8 grid grid-cols-3 gap-4 lg:grid-cols-1 lg:gap-4">
              {landingCharacters.map((character, index) => (
                <div
                  key={character.src}
                  className="flex aspect-square items-center justify-center rounded-lg border border-[#2a3142]/70 bg-[#080a10]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_20px_40px_rgba(0,0,0,0.35)] lg:h-[25vh] lg:min-h-36 lg:max-h-44 lg:aspect-auto"
                >
                  <Image
                    src={character.src}
                    alt={character.alt}
                    width={170}
                    height={170}
                    priority={index === 0}
                    unoptimized
                    className="h-[72%] w-[72%] object-contain"
                    style={{ imageRendering: "pixelated" }}
                  />
                </div>
              ))}
            </div>
          </aside>

          <div className="relative flex min-h-[62vh] flex-col items-center justify-center px-6 py-10 text-center lg:min-h-[calc(100vh-81px)] lg:px-12">
            <div className="landing-copy-rise max-w-3xl">
              <h1 className="text-5xl font-black tracking-normal text-[#fafafa] drop-shadow-[0_6px_24px_rgba(0,0,0,0.75)] sm:text-7xl lg:text-8xl">
                {t.landingTitle}
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-2xl font-black leading-8 text-[#f0b84f] drop-shadow-[0_4px_18px_rgba(0,0,0,0.8)] sm:text-3xl">
                {t.landingTagline}
              </p>
              <p className="mx-auto mt-6 max-w-xl text-base font-semibold leading-7 text-[#d9deea]/88 drop-shadow-[0_4px_18px_rgba(0,0,0,0.8)] sm:text-lg">
                {t.landingSubtitle}
              </p>
              <button
                type="button"
                onClick={() => setShowLanding(false)}
                className="mt-10 h-14 rounded-lg border border-[#d99a2b]/70 bg-[#9f2f2b] px-10 text-base font-black text-[#fafafa] shadow-[0_18px_45px_rgba(0,0,0,0.52),inset_0_1px_0_rgba(255,255,255,0.18)] transition hover:border-[#fafafa] hover:bg-[#b83a35] focus:outline-none focus:ring-2 focus:ring-[#d99a2b]"
              >
                {t.getStart}
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070a12] text-[#d9deea]">
      <input
        ref={pixelImportInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => void handlePixelEditorImport(event)}
        className="hidden"
      />
      <nav className="relative border-b border-[#2a3142] bg-[#111827] text-[#d9deea] shadow-[0_8px_28px_rgba(0,0,0,0.35)]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-4 sm:px-8 lg:px-10 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f0b84f]">
                {t.appName}
              </p>
              <h1 className="text-2xl font-bold tracking-normal text-[#fafafa]">
                {t.title}
              </h1>
            </div>

            <div className="flex rounded-lg border border-[#2a3142] bg-[#080b13] p-1">
              <button
                type="button"
                onClick={() => setActiveModule("character")}
                className={`h-9 rounded-md px-4 text-sm font-semibold transition ${
                  activeModule === "character"
                    ? "bg-[#d99a2b] text-[#18181b]"
                    : "text-[#d9deea] hover:bg-[#20283a]"
                }`}
              >
                {t.character}
              </button>
              <button
                type="button"
                onClick={() => setActiveModule("portfolio")}
                className={`h-9 rounded-md px-4 text-sm font-semibold transition ${
                  activeModule === "portfolio"
                    ? "bg-[#d99a2b] text-[#18181b]"
                    : "text-[#d9deea] hover:bg-[#20283a]"
                }`}
              >
                {t.portfolio}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveModule("editor");
                  void openBlankPixelEditor();
                }}
                className={`h-9 rounded-md px-4 text-sm font-semibold transition ${
                  activeModule === "editor"
                    ? "bg-[#d99a2b] text-[#18181b]"
                    : "text-[#d9deea] hover:bg-[#20283a]"
                }`}
              >
                {t.editor}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {authUser ? (
              <div className="flex items-center gap-2">
                <div className="flex h-10 items-center gap-2 rounded-full border border-[#2a3142] bg-[#111827] px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <span className="rounded-full border border-[#d99a2b] bg-[#211a12] px-2 py-1 text-[10px] font-bold uppercase text-[#f0b84f]">
                    {t.points}
                  </span>
                  <span className="text-sm font-bold text-[#f0b84f]">
                    {authUser.points}
                  </span>
                  <span className="h-4 w-px bg-[#27272a]" />
                  <button
                    type="button"
                    onClick={openBilling}
                    className="rounded-full px-2 py-1 text-xs font-bold text-[#fafafa] transition hover:bg-[#3a1f2b] hover:text-[#f0b84f]"
                  >
                    {t.recharge}
                  </button>
                </div>
                <div className="flex h-12 items-center gap-3 rounded-lg border border-[#2a3142] bg-[#080b13] px-3">
                  <p className="max-w-32 truncate text-sm font-semibold text-[#fafafa]">
                    {authUser.username}
                  </p>
                  <button
                    type="button"
                    onClick={logout}
                    className="rounded-md border border-[#2a3142] px-2 py-1 text-xs font-semibold text-[#d9deea] transition hover:border-[#d99a2b]"
                  >
                    {t.logout}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openAuth("login")}
                  className="h-10 rounded-lg border border-[#2a3142] bg-[#080b13] px-4 text-sm font-semibold text-[#fafafa] transition hover:border-[#2dd4bf]"
                >
                  {t.login}
                </button>
                <button
                  type="button"
                  onClick={() => openAuth("register")}
                  className="h-10 rounded-lg bg-[#9f2f2b] px-4 text-sm font-bold text-[#fafafa] transition hover:bg-[#b83a35]"
                >
                  {t.register}
                </button>
              </div>
            )}

            <label className="flex h-10 items-center gap-2 rounded-lg border border-[#2a3142] bg-[#080b13] px-3 text-sm text-[#d4d4d8] xl:absolute xl:right-8 xl:top-4">
              <span>{t.language}</span>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value as Language)}
                className="h-8 rounded-md border border-[#2a3142] bg-[#111827] px-2 text-sm font-semibold text-[#fafafa] outline-none transition focus:border-[#2dd4bf]"
              >
                <option value="zh">{"\u4e2d\u6587"}</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>
        </div>
      </nav>

      <div className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-7xl flex-col gap-4 px-6 py-6 sm:px-8 lg:px-10">
        {paymentMessage && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-[#2dd4bf]/40 bg-[#09231f] p-3 text-sm font-semibold text-[#99f6e4]">
            <span>{paymentMessage}</span>
            <button
              type="button"
              onClick={() => setPaymentMessage("")}
              className="rounded-md border border-[#2dd4bf]/50 px-2 py-1 text-xs text-[#ccfbf1] transition hover:bg-[#134e4a]"
            >
              {t.close}
            </button>
          </div>
        )}

        {activeModule === "character" ? (
          <>
            <header className="border-b border-[#243049] pb-6">
              <p className="max-w-3xl text-sm leading-6 text-[#8f9aaf] sm:text-base">
                {typedIntro}
                <span className="ml-1 inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-[#c69a4a]" />
              </p>
            </header>

            <section className="grid flex-1 gap-4 xl:grid-cols-[minmax(0,760px)_minmax(420px,1fr)]">
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="flex flex-col gap-2 rounded-lg border border-[#2a3142] bg-[#151b2b] p-6">
                    <label className="text-sm font-semibold text-[#d9deea]" htmlFor="desc">
                      {t.label}
                    </label>
                    <textarea
                      id="desc"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder={t.placeholder}
                      className="min-h-[224px] w-full flex-1 resize-none rounded-lg border border-[#2a3142] bg-[#0b1020] p-4 text-base leading-7 text-[#fafafa] outline-none transition placeholder:text-[#647084] focus:border-[#2dd4bf]"
                    />
                  </div>

                  <div className="rounded-lg border border-[#2a3142] bg-[#151b2b] p-6">
                    <div>
                      <p className="text-sm font-semibold text-[#d9deea]">
                        {t.styleTemplate}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#8f9aaf]">{t.styleHint}</p>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        aria-label={t.noTemplate}
                        onClick={() => setStyleTemplate("none")}
                        className={`flex min-h-36 flex-col rounded-lg border p-4 text-left transition ${
                          styleTemplate === "none"
                            ? "border-[#d99a2b] bg-[#211a12] shadow-[0_0_0_1px_rgba(217,154,43,0.22)]"
                            : "border-[#2a3142] bg-[#080b13] hover:border-[#2a3142]"
                        }`}
                      >
                        <div className="flex flex-1 flex-col justify-between gap-3">
                          <div>
                            <span className="text-sm font-semibold text-[#fafafa]">
                              {t.noTemplate}
                            </span>
                          </div>
                          <div className="flex justify-center">
                            <Image
                              src="/landing/default-template-showcase.png"
                              alt={t.noTemplate}
                              width={128}
                              height={128}
                              unoptimized
                              className="h-24 w-20 max-w-full object-contain"
                              style={{ imageRendering: "pixelated" }}
                            />
                          </div>
                        </div>
                      </button>
                      {styleTemplateOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          aria-label={option[language]}
                          onClick={() => setStyleTemplate(option.id)}
                          className={`flex min-h-36 flex-col rounded-lg border p-4 text-left transition ${
                            styleTemplate === option.id
                              ? "border-[#d99a2b] bg-[#211a12] shadow-[0_0_0_1px_rgba(217,154,43,0.22)]"
                              : "border-[#2a3142] bg-[#080b13] hover:border-[#2a3142]"
                          }`}
                        >
                          <div className="flex flex-1 flex-col justify-between gap-3">
                            <div className="rounded-md bg-[#fafafa] p-2">
                              <Image
                                src={option.image}
                                alt={option[language]}
                                width={128}
                                height={128}
                                unoptimized
                                className="mx-auto h-20 w-20 max-w-full rounded object-contain"
                                style={{ imageRendering: "pixelated" }}
                              />
                            </div>
                            <div className="flex justify-center">
                              <span className="inline-flex rounded-md border border-[#d99a2b] bg-[#211a12] px-3 py-1 text-xs font-bold text-[#f0b84f] shadow-[0_0_12px_rgba(217,154,43,0.16)]">
                                {t.templateExtraCost}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="rounded-lg border border-[#2a3142] bg-[#151b2b] p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#d9deea]">
                          {t.upload} <span className="text-xs font-medium text-[#8f9aaf]">({t.optional})</span>
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#8f9aaf]">{t.uploadHint}</p>
                      </div>
                      <span className="shrink-0 rounded-md border border-[#d99a2b] bg-[#211a12] px-3 py-1 text-xs font-bold text-[#f0b84f]">
                        {t.referenceExtraCost}
                      </span>
                      {characterReferenceImage && (
                        <button
                          type="button"
                          onClick={() => setCharacterReferenceImage("")}
                          className="rounded-md border border-[#2a3142] px-3 py-1 text-xs font-semibold text-[#d9deea] transition hover:border-[#d99a2b]"
                        >
                          {t.removeImage}
                        </button>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <label className="inline-flex h-10 cursor-pointer items-center rounded-lg bg-[#9f2f2b] px-4 text-sm font-bold text-[#fafafa] transition hover:bg-[#b83a35]">
                        {t.uploadButton}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleReferenceUpload}
                          className="hidden"
                        />
                      </label>
                      {characterReferenceImage && (
                        <Image
                          src={characterReferenceImage}
                          alt="Character reference preview"
                          width={64}
                          height={64}
                          unoptimized
                          className="h-12 w-12 rounded-md border border-[#2a3142] object-cover"
                        />
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#2a3142] bg-[#151b2b] p-6">
                    <p className="text-sm font-semibold text-[#d9deea]">
                      {t.generationSettings}
                    </p>

                    <div className="mt-3 flex flex-col gap-3">
                      <div>
                        <p className="mb-2 text-xs font-semibold text-[#8f9aaf]">{t.direction}</p>
                        <div className="grid grid-cols-4 gap-2">
                          {directionOptions.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setDirection(option.id)}
                              className={`rounded-md border px-2 py-1.5 text-xs font-bold transition ${
                                direction === option.id
                                  ? "border-[#d99a2b] bg-[#211a12] text-[#f0b84f]"
                                  : "border-[#2a3142] bg-[#080b13] text-[#d9deea] hover:border-[#2a3142]"
                              }`}
                            >
                              {option[language]}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-semibold text-[#8f9aaf]">{t.outputSize}</p>
                        <div className="flex gap-2">
                          {outputSizeOptions.map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setOutputSize(size)}
                              className={`rounded-md border px-3 py-1.5 text-xs font-bold transition ${
                                outputSize === size
                                  ? "border-[#d99a2b] bg-[#211a12] text-[#f0b84f]"
                                  : "border-[#2a3142] bg-[#080b13] text-[#d9deea] hover:border-[#2a3142]"
                              }`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-[1fr_88px] gap-3">
                        <div>
                          <label className="text-xs font-semibold text-[#8f9aaf]">
                            {t.styleStrength}: {styleStrength.toFixed(1)}
                            <input
                              type="range"
                              min="0.1"
                              max="1"
                              step="0.1"
                              value={styleStrength}
                              onChange={(event) => setStyleStrength(Number(event.target.value))}
                              className="mt-2 w-full accent-[#d99a2b]"
                            />
                          </label>
                        </div>
                        <label className="text-xs font-semibold text-[#8f9aaf]">
                          {t.seed}
                          <input
                            value={seed}
                            onChange={(event) => setSeed(event.target.value.replace(/\D/g, "").slice(0, 10))}
                            placeholder={t.randomSeed}
                            className="mt-2 h-8 w-full rounded-md border border-[#2a3142] bg-[#080b13] px-2 text-xs text-[#d9deea] outline-none placeholder:text-[#647084] focus:border-[#2dd4bf]"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={generateCharacter}
                  disabled={loading || !canGenerate}
                  className="h-12 rounded-lg bg-[#9f2f2b] px-6 text-base font-bold text-[#fafafa] transition hover:bg-[#b83a35] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? t.generating : `${t.generate} (${generationCost} Point)`}
                </button>

                {error && (
                  <p className="rounded-lg border border-[#7f1d1d] bg-[#2f0c12] p-3 text-sm text-[#ffb1a8]">
                    {error}
                  </p>
                )}

                <div className="flex items-center gap-3">
                  <div className="min-h-28 flex-1 rounded-lg border border-[#2a3142] bg-[#151b2b] p-6">
                    <p className="text-sm leading-6 text-[#8f9aaf]">
                      {t.info}
                    </p>
                  </div>
                  <Image
                    src={loading ? "/charge_sprite/charge-loop.gif" : "/charge_sprite/charge-1.png"}
                    alt={loading ? "Charging sprite" : "Idle sprite"}
                    width={128}
                    height={128}
                    unoptimized
                    className="h-24 w-24 shrink-0 object-contain sm:h-28 sm:w-28"
                    style={{ imageRendering: "pixelated" }}
                  />
                </div>
              </div>

              <div className="flex min-h-[500px] items-center justify-center rounded-lg border border-[#2a3142] bg-[#151b2b] p-6">
                {imageUrl ? (
                  <div className="flex flex-col items-center gap-4">
                    <Image
                      src={imageUrl}
                      alt="Generated pixel character"
                      width={128}
                      height={128}
                      unoptimized
                      ref={generatedImageRef}
                      className="h-[min(512px,80vw)] w-[min(512px,80vw)] object-contain"
                      style={{
                        imageRendering: "pixelated",
                        transform: isImageFlipped ? "scaleX(-1)" : "none",
                      }}
                    />
                    <div className="flex flex-wrap justify-center gap-3">
                      <button
                        type="button"
                        onClick={downloadDisplayedImage}
                        className="rounded-lg border border-[#2a3142] bg-[#0b1020] px-4 py-2 text-sm font-semibold text-[#fafafa] transition hover:border-[#2dd4bf]"
                      >
                        {t.download}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsImageFlipped((flipped) => !flipped)}
                        className="rounded-lg border border-[#2a3142] bg-[#0b1020] px-4 py-2 text-sm font-semibold text-[#fafafa] transition hover:border-[#2dd4bf]"
                      >
                        {t.flipHorizontal}
                      </button>
                      <button
                        type="button"
                        onClick={copyGeneratedImage}
                        className="rounded-lg border border-[#2a3142] bg-[#0b1020] px-4 py-2 text-sm font-semibold text-[#fafafa] transition hover:border-[#2dd4bf]"
                      >
                        {copied ? t.copied : t.copy}
                      </button>
                    </div>

                    <div className="w-full max-w-sm rounded-lg border border-[#2a3142] bg-[#0b1020] p-6">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-[#d9deea]">{t.spritePreview}</p>
                        <div className="flex rounded-md border border-[#2a3142] bg-[#111827] p-1">
                          {(["idle", "walk"] as const).map((kind) => (
                            <button
                              key={kind}
                              type="button"
                              onClick={() => setSpriteAnimation(kind)}
                              className={`rounded px-3 py-1 text-xs font-bold transition ${
                                spriteAnimation === kind
                                  ? "bg-[#d99a2b] text-[#18181b]"
                                  : "text-[#d9deea] hover:bg-[#20283a]"
                              }`}
                            >
                              {kind === "idle" ? t.idle : t.walk}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-center rounded-md border border-[#334155] bg-[#141824] p-3">
                        <canvas
                          ref={spritePreviewCanvasRef}
                          className="h-28 w-28"
                          style={{ imageRendering: "pixelated" }}
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => void exportSpriteSheet(spriteAnimation)}
                          className="rounded-lg border border-[#2a3142] bg-[#111827] px-3 py-2 text-sm font-semibold text-[#fafafa] transition hover:border-[#2dd4bf]"
                        >
                          {t.exportSpriteSheet}
                        </button>
                        <button
                          type="button"
                          onClick={() => void exportSpriteGif(spriteAnimation)}
                          className="rounded-lg border border-[#2a3142] bg-[#111827] px-3 py-2 text-sm font-semibold text-[#fafafa] transition hover:border-[#2dd4bf]"
                        >
                          {t.exportGif}
                        </button>
                      </div>
                    </div>

                    <div className="flex w-full justify-center">
                      <button
                        type="button"
                        onClick={() => void openPixelEditor()}
                        className="rounded-lg border border-[#d99a2b] bg-[#d99a2b] px-6 py-3 text-sm font-black text-[#18181b] shadow-[0_10px_24px_rgba(217,154,43,0.22)] transition hover:border-[#fafafa] hover:bg-[#eab54a]"
                      >
                        {t.editPixels}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-sm text-[#8f9aaf]">
                    {t.emptyResult}
                  </div>
                )}
              </div>
            </section>
          </>
        ) : activeModule === "animation" ? (
          <section className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
            <div className="rounded-lg border border-[#2a3142] bg-[#151b2b] p-6">
              <h2 className="text-xl font-bold text-[#fafafa]">
                {t.animationTitle}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#8f9aaf]">
                {t.animationIntro}
              </p>
            </div>
            <div className="flex min-h-[560px] items-center justify-center rounded-lg border border-[#2a3142] bg-[#151b2b] p-6">
              <Image
                src="/charge_sprite/charge-loop.gif"
                alt="Animation preview"
                width={128}
                height={128}
                unoptimized
                className="h-40 w-40 object-contain"
                style={{ imageRendering: "pixelated" }}
              />
            </div>
          </section>
        ) : activeModule === "editor" ? (
          <section className="flex flex-1 flex-col gap-4">
            <div className="rounded-lg border border-[#2a3142] bg-[#151b2b] p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#fafafa]">
                    {t.editorTitle}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[#8f9aaf]">
                    {t.editorIntro}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void openBlankPixelEditor()}
                    className="rounded-lg border border-[#d99a2b] bg-[#d99a2b] px-4 py-2 text-sm font-bold text-[#18181b] transition hover:bg-[#eab54a]"
                  >
                    {t.openBlankEditor}
                  </button>
                  <button
                    type="button"
                    onClick={() => pixelImportInputRef.current?.click()}
                    className="rounded-lg border border-[#2a3142] bg-[#0b1020] px-4 py-2 text-sm font-semibold text-[#fafafa] transition hover:border-[#2dd4bf]"
                  >
                    {t.importImage}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
              <div className="flex min-h-[560px] items-center justify-center rounded-lg border border-[#2a3142] bg-[linear-gradient(45deg,#111827_25%,transparent_25%),linear-gradient(-45deg,#111827_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#111827_75%),linear-gradient(-45deg,transparent_75%,#111827_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0] p-6">
                {pixelEditorOpen ? (
                  <canvas
                    ref={pixelCanvasRef}
                    onPointerDown={beginPixelStroke}
                    onPointerMove={drawPixel}
                    className="max-h-[640px] max-w-full rounded border border-[#2a3142] bg-transparent"
                    style={{
                      imageRendering: "pixelated",
                      width: `${Math.min(pixelEditorSize.width * pixelEditorZoom, 720)}px`,
                      height: `${Math.min(pixelEditorSize.height * pixelEditorZoom, 720)}px`,
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => void openBlankPixelEditor()}
                    className="rounded-lg border border-[#d99a2b] bg-[#211a12] px-6 py-3 text-sm font-bold text-[#f0b84f] transition hover:bg-[#20283a]"
                  >
                    {t.openBlankEditor}
                  </button>
                )}
              </div>

              <div className="rounded-lg border border-[#2a3142] bg-[#151b2b] p-6">
                <div className="flex flex-col gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#fafafa]">{t.pixelEditorTitle}</h2>
                    <p className="mt-1 text-xs text-[#8f9aaf]">
                      {pixelEditorSize.width} x {pixelEditorSize.height}
                    </p>
                  </div>
                  <label className="text-xs font-semibold text-[#8f9aaf]">
                    {t.zoom}: {pixelEditorZoom}x
                    <input
                      type="range"
                      min="2"
                      max="8"
                      step="1"
                      value={pixelEditorZoom}
                      onChange={(event) => setPixelEditorZoom(Number(event.target.value))}
                      className="mt-2 w-full accent-[#d99a2b]"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPixelTool("brush")}
                      className={`rounded-lg border px-3 py-2 text-sm font-bold transition ${
                        pixelTool === "brush"
                          ? "border-[#d99a2b] bg-[#d99a2b] text-[#18181b]"
                          : "border-[#2a3142] bg-[#080b13] text-[#d9deea] hover:border-[#2a3142]"
                      }`}
                    >
                      {t.brush}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPixelTool("eraser")}
                      className={`rounded-lg border px-3 py-2 text-sm font-bold transition ${
                        pixelTool === "eraser"
                          ? "border-[#d99a2b] bg-[#d99a2b] text-[#18181b]"
                          : "border-[#2a3142] bg-[#080b13] text-[#d9deea] hover:border-[#2a3142]"
                      }`}
                    >
                      {t.eraser}
                    </button>
                  </div>
                  <input
                    type="color"
                    value={pixelColor}
                    onChange={(event) => setPixelColor(event.target.value)}
                    className="h-11 w-full rounded-lg border border-[#2a3142] bg-[#080b13] p-1"
                  />
                  <button
                    type="button"
                    onClick={() => pixelImportInputRef.current?.click()}
                    className="rounded-lg border border-[#2a3142] bg-[#0b1020] px-3 py-2 text-sm font-bold text-[#d9deea] transition hover:border-[#2dd4bf]"
                  >
                    {t.importImage}
                  </button>
                  <button
                    type="button"
                    onClick={undoPixelEdit}
                    className="rounded-lg border border-[#2a3142] bg-[#0b1020] px-3 py-2 text-sm font-bold text-[#d9deea] transition hover:border-[#2dd4bf]"
                  >
                    {t.undo}
                  </button>
                  <button
                    type="button"
                    onClick={savePixelEditToPreview}
                    className="rounded-lg bg-[#9f2f2b] px-3 py-2 text-sm font-bold text-[#fafafa] transition hover:bg-[#b83a35]"
                  >
                    {t.saveEdit}
                  </button>
                </div>
              </div>
            </div>

            {portfolioError && (
              <p className="rounded-lg border border-[#7f1d1d] bg-[#2f0c12] p-3 text-sm text-[#ffb1a8]">
                {portfolioError}
              </p>
            )}

            {portfolioLoading ? (
              <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-[#2a3142] bg-[#151b2b] p-6 text-sm text-[#8f9aaf]">
                {language === "zh" ? "加载中..." : "Loading..."}
              </div>
            ) : portfolioItems.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {portfolioItems.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-lg border border-[#2a3142] bg-[#151b2b] p-6"
                  >
                    <div className="flex aspect-square items-center justify-center rounded-md border border-[#2a3142] bg-[#080b13] p-3">
                      <Image
                        src={item.imageUrl}
                        alt={item.description || "Generated pixel character"}
                        width={128}
                        height={128}
                        unoptimized
                        onError={() => void removeBrokenPortfolioImage(item.id)}
                        className="h-full w-full object-contain"
                        style={{ imageRendering: "pixelated" }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-bold text-[#fafafa]">
                        {item.title || item.description || (language === "zh" ? "未命名资产" : "Untitled Asset")}
                      </p>
                      <button
                        type="button"
                        onClick={() => void openPortfolioImageInEditor(item)}
                        className="shrink-0 rounded-md border border-[#d99a2b] bg-[#211a12] px-3 py-2 text-xs font-bold text-[#f0b84f] transition hover:bg-[#20283a]"
                      >
                        {t.editThisImage}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-[#2a3142] bg-[#151b2b] p-6 text-center text-sm text-[#8f9aaf]">
                {authUser ? t.emptyPortfolio : t.editorEmptyPortfolio}
              </div>
            )}
          </section>
        ) : (
          <section className="flex flex-1 flex-col gap-4">
            <div className="rounded-lg border border-[#2a3142] bg-[#151b2b] p-6">
              <h2 className="text-xl font-bold text-[#fafafa]">
                {t.portfolioTitle}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#8f9aaf]">
                {t.portfolioIntro}
              </p>
            </div>

            {portfolioError && (
              <p className="rounded-lg border border-[#7f1d1d] bg-[#2f0c12] p-3 text-sm text-[#ffb1a8]">
                {portfolioError}
              </p>
            )}

            {portfolioLoading ? (
              <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-[#2a3142] bg-[#151b2b] p-6 text-sm text-[#8f9aaf]">
                {language === "zh" ? "加载中..." : "Loading..."}
              </div>
            ) : portfolioItems.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {portfolioItems.map((item) => (
                  <article
                    key={item.id}
                    className="group relative rounded-lg border border-[#2a3142] bg-[#151b2b] p-6"
                  >
                    <div className="flex aspect-square items-center justify-center rounded-md border border-[#2a3142] bg-[#080b13] p-3">
                      <Image
                        src={item.imageUrl}
                        alt={item.description || "Generated pixel character"}
                        width={128}
                        height={128}
                        unoptimized
                        onError={() => void removeBrokenPortfolioImage(item.id)}
                        className="h-full w-full object-contain"
                        style={{ imageRendering: "pixelated" }}
                      />
                    </div>
                    <a
                      href={item.imageUrl}
                      download
                      aria-label={t.download}
                      className="hidden"
                    >
                      ↓
                    </a>
                    <button
                      type="button"
                      onClick={() => void deletePortfolioImage(item.id)}
                      aria-label={t.delete}
                      className="hidden"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                      </svg>
                    </button>
                    <div className="mt-3 flex flex-col gap-2">
                      <div className="hidden">
                        <div>
                          <p className="line-clamp-1 text-sm font-bold text-[#fafafa]">
                            {item.title || item.description || (language === "zh" ? "未命名资产" : "Untitled Asset")}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#8f9aaf]">
                            {item.category || "character"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const title = window.prompt(t.rename, item.title || item.description || "");
                            if (title !== null) {
                              void updatePortfolioItem(item.id, { title });
                            }
                          }}
                          className="rounded-md border border-[#2a3142] px-2 py-1 text-xs font-bold text-[#d9deea] transition hover:border-[#d99a2b]"
                        >
                          {t.rename}
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => void openPortfolioImageInEditor(item)}
                          className="rounded-md border border-[#d99a2b] bg-[#211a12] px-2 py-2 text-xs font-bold text-[#f0b84f] transition hover:bg-[#20283a]"
                        >
                          {t.editThisImage}
                        </button>
                        <a
                          href={item.imageUrl}
                          download
                          aria-label={t.download}
                          className="rounded-md border border-[#2a3142] bg-[#0b1020] px-2 py-2 text-center text-xs font-bold text-[#d9deea] transition hover:border-[#2dd4bf]"
                        >
                          {t.download}
                        </a>
                        <button
                          type="button"
                          onClick={() => void deletePortfolioImage(item.id)}
                          aria-label={t.delete}
                          className="flex items-center justify-center rounded-md border border-[#2a3142] bg-[#0b1020] px-2 py-2 text-[#ffb1a8] transition hover:border-[#7f1d1d] hover:bg-[#2f0c12]"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-[#2a3142] bg-[#151b2b] p-6 text-sm text-[#8f9aaf]">
                {t.emptyPortfolio}
              </div>
            )}
          </section>
        )}
      </div>

      {authOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4">
          <div className="w-full max-w-md rounded-lg border border-[#2a3142] bg-[#151b2b] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#fafafa]">
                  {authMode === "login" ? t.loginTitle : t.registerTitle}
                </h2>
                <p className="mt-1 text-xs leading-5 text-[#8f9aaf]">
                  {t.localAuthNote}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAuthOpen(false)}
                className="h-8 w-8 rounded-md border border-[#2a3142] text-sm font-bold text-[#d9deea] transition hover:border-[#d99a2b]"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="mt-6">
              {GOOGLE_CLIENT_ID ? (
                <div ref={googleButtonRef} className="min-h-11 w-full overflow-hidden rounded-lg" />
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-[#dadce0] bg-white text-sm font-bold text-[#202124] transition hover:bg-[#f8fafd]"
                >
                  {t.googleLogin}
                </button>
              )}
            </div>

            <form className="mt-4 flex flex-col gap-3" onSubmit={handleAuthSubmit}>
              {authMode === "register" && (
                <label className="flex flex-col gap-1 text-sm font-semibold text-[#d9deea]">
                  {t.username}
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="h-11 rounded-lg border border-[#2a3142] bg-[#080b13] px-3 text-sm text-[#fafafa] outline-none transition placeholder:text-[#647084] focus:border-[#2dd4bf]"
                  />
                </label>
              )}

              <label className="flex flex-col gap-1 text-sm font-semibold text-[#d9deea]">
                {t.email}
                <input
                  type="text"
                  inputMode="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 rounded-lg border border-[#2a3142] bg-[#080b13] px-3 text-sm text-[#fafafa] outline-none transition placeholder:text-[#647084] focus:border-[#2dd4bf]"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-semibold text-[#d9deea]">
                {t.password}
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 rounded-lg border border-[#2a3142] bg-[#080b13] px-3 text-sm text-[#fafafa] outline-none transition placeholder:text-[#647084] focus:border-[#2dd4bf]"
                />
              </label>

              {authMode === "register" && (
                <label className="flex flex-col gap-1 text-sm font-semibold text-[#d9deea]">
                  {t.confirmPassword}
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-11 rounded-lg border border-[#2a3142] bg-[#080b13] px-3 text-sm text-[#fafafa] outline-none transition placeholder:text-[#647084] focus:border-[#2dd4bf]"
                  />
                </label>
              )}

              {authError && (
                <p className="rounded-lg border border-[#7f1d1d] bg-[#2f0c12] p-3 text-sm text-[#ffb1a8]">
                  {authError}
                </p>
              )}

              <button
                type="submit"
                className="mt-1 h-11 rounded-lg bg-[#9f2f2b] text-sm font-bold text-[#fafafa] transition hover:bg-[#b83a35]"
              >
                {authMode === "login" ? t.emailLogin : t.createAccount}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === "login" ? "register" : "login");
                setAuthError("");
              }}
              className="mt-4 w-full text-center text-sm font-semibold text-[#f0b84f] transition hover:text-[#f0b84f]"
            >
              {authMode === "login" ? t.switchToRegister : t.switchToLogin}
            </button>
          </div>
        </div>
      )}

      {billingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4">
          <div className="w-full max-w-lg rounded-lg border border-[#2a3142] bg-[#151b2b] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#fafafa]">
                  {t.rechargeTitle}
                </h2>
                <p className="mt-1 text-xs leading-5 text-[#8f9aaf]">
                  {t.rechargeIntro}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBillingOpen(false)}
                className="h-8 w-8 rounded-md border border-[#2a3142] text-sm font-bold text-[#d9deea] transition hover:border-[#d99a2b]"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              <div className="rounded-lg border border-[#2a3142] bg-[#0b1020] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8f9aaf]">
                  {t.paymentMethod}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-[#2a3142] bg-[#080b13] p-1">
                  {(["card", "alipay"] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      disabled={billingLoading}
                      onClick={() => setBillingPaymentMethod(method)}
                      className={`h-10 rounded-md px-4 text-sm font-bold transition ${
                        billingPaymentMethod === method
                          ? "bg-[#d99a2b] text-[#18181b]"
                          : "text-[#d9deea] hover:bg-[#20283a]"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {method === "card" ? t.cardPayment : t.alipayPayment}
                    </button>
                  ))}
                </div>
              </div>
              {billingPackages.map((pointPackage) => {
                const packageArt = billingPackageArt[pointPackage.id];
                const displayedPrice =
                  billingPaymentMethod === "alipay"
                    ? `¥${((pointPackage.amountCents * 4) / 100).toFixed(2)}`
                    : `$${(pointPackage.amountCents / 100).toFixed(2).toUpperCase()}`;

                return (
                  <button
                    key={pointPackage.id}
                    type="button"
                    disabled={billingLoading}
                    onClick={() => startCheckout(pointPackage.id)}
                    className="grid min-h-24 grid-cols-[1fr_auto_auto] items-center gap-4 rounded-lg border border-[#2a3142] bg-[#0b1020] p-4 text-left transition hover:border-[#2dd4bf] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span>
                      <span className="block text-base font-bold text-[#fafafa]">
                        {language === "zh" ? pointPackage.zhName : pointPackage.enName}
                      </span>
                      <span className="mt-1 block text-xs text-[#8f9aaf]">
                        {pointPackage.points} Point
                      </span>
                    </span>
                    {packageArt && (
                      <span className="flex h-16 w-20 items-center justify-center overflow-visible">
                        <Image
                          src={packageArt.src}
                          alt={packageArt.alt}
                          width={86}
                          height={86}
                          unoptimized
                          className="max-h-20 w-auto object-contain"
                          style={{ imageRendering: "pixelated" }}
                        />
                      </span>
                    )}
                    <span className="text-right">
                      <span className="block text-base font-bold text-[#f0b84f]">
                        {displayedPrice}
                      </span>
                      <span className="mt-1 block text-xs text-[#8f9aaf]">
                        {billingLoading ? t.checkoutLoading : t.checkout}
                      </span>
                    </span>
                  </button>
                );
              })}

              {billingLoading && billingPackages.length === 0 && (
                <div className="rounded-lg border border-[#2a3142] bg-[#0b1020] p-4 text-sm text-[#8f9aaf]">
                  {language === "zh" ? "加载中..." : "Loading..."}
                </div>
              )}

              {billingError && (
                <p className="rounded-lg border border-[#7f1d1d] bg-[#2f0c12] p-3 text-sm text-[#ffb1a8]">
                  {billingError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      <footer className="px-6 pb-6 text-center text-xs text-[#71717a]">
        <a href="/terms" className="transition hover:text-[#f0b84f]">
          {t.legalLinks}
        </a>
      </footer>
    </main>
  );
}
