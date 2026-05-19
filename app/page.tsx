"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";

type Language = "zh" | "en";
type Module = "character" | "animation" | "portfolio";
type StyleTemplate = "none" | "japanese_rpg";
type AuthMode = "login" | "register";

type AuthUser = {
  username: string;
  email: string;
  points: number;
};

type PortfolioGeneration = {
  id: string;
  imageUrl: string;
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
    zh: "日式 RPG",
    en: "Japanese RPG",
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

const copy = {
  zh: {
    appName: "AI Pixel Sprite Tool",
    title: "像素角色生成器",
    intro: "输入角色描述或上传角色参考图，选择画风模板，生成 128x128 像素 PNG。",
    language: "语言",
    character: "角色",
    animation: "动画",
    portfolio: "作品集",
    optional: "可选",
    styleTemplate: "画风模板",
    styleHint: "默认不使用模板。使用模板会额外消耗 2 Point。",
    noTemplate: "不使用模板",
    templateExtraCost: "+2 Point",
    referenceExtraCost: "+1 Point",
    label: "角色描述",
    upload: "角色参考图",
    uploadHint: "可选。上传参考图会额外消耗 1 Point。",
    uploadButton: "上传图片",
    removeImage: "移除",
    placeholder: "例如：一个戴着紫色巫师帽的粉色长发女性法师",
    generate: "生成角色",
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
    portfolioIntro: "这里会保存你账号下 7 天内生成过的角色图片；过期或损坏的图片会自动删除。",
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
    copied: "已复制",
    copyImageUnsupported: "当前浏览器不支持复制图片，已复制图片链接。",
    rechargeTitle: "充值 Point",
    rechargeIntro: "选择一个 Point 套餐，付款成功后会自动加入余额。",
    checkout: "去付款",
    checkoutLoading: "正在打开付款页...",
    checkoutFailed: "无法打开付款页，请稍后再试。",
    packageLoadFailed: "加载套餐失败，请稍后再试。",
    paymentSuccess: "付款成功，Point 已到账。",
    paymentCancel: "付款已取消。",
    close: "关闭",
    legalLinks: "条款 / 隐私 / 退款 / 联系方式",
  },
  en: {
    appName: "AI Pixel Sprite Tool",
    title: "Pixel Character Generator",
    intro: "Enter a character description or upload a character reference, choose a style template, and generate a 128x128 pixel PNG.",
    language: "Language",
    character: "Character",
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
    generate: "Generate Character",
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
    portfolioIntro: "Generated character images are saved here for 7 days. Expired or broken images are removed automatically.",
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
    copied: "Copied",
    copyImageUnsupported: "This browser cannot copy images, so the image link was copied.",
    rechargeTitle: "Recharge Points",
    rechargeIntro: "Choose a Point package. Points are added automatically after payment.",
    checkout: "Checkout",
    checkoutLoading: "Opening checkout...",
    checkoutFailed: "Unable to open checkout. Please try again later.",
    packageLoadFailed: "Failed to load packages. Please try again later.",
    paymentSuccess: "Payment succeeded. Points have been added.",
    paymentCancel: "Payment was canceled.",
    close: "Close",
    legalLinks: "Terms / Privacy / Refunds / Contact",
  },
};

export default function Home() {
  const [language, setLanguage] = useState<Language>("zh");
  const [activeModule, setActiveModule] = useState<Module>("character");
  const [styleTemplate, setStyleTemplate] = useState<StyleTemplate>("none");
  const [description, setDescription] = useState("");
  const [characterReferenceImage, setCharacterReferenceImage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [generationImageApiUrl, setGenerationImageApiUrl] = useState("");
  const [isImageFlipped, setIsImageFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [typedIntro, setTypedIntro] = useState("");
  const [copied, setCopied] = useState(false);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioGeneration[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState("");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authOpen, setAuthOpen] = useState(false);
  const [authError, setAuthError] = useState("");
  const [billingOpen, setBillingOpen] = useState(false);
  const [billingPackages, setBillingPackages] = useState<PointPackage[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const generatedImageRef = useRef<HTMLImageElement | null>(null);
  const t = copy[language];
  const canGenerate = Boolean(description.trim() || characterReferenceImage);
  const generationCost = 1 + (styleTemplate === "none" ? 0 : 2) + (characterReferenceImage ? 1 : 0);

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
            setAuthError(t.googleLoginFailed);
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
              setAuthError(data.error || t.googleLoginFailed);
              return;
            }

            saveSession(data.user as AuthUser);
            setAuthOpen(false);
          } catch {
            setAuthError(t.googleLoginFailed);
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
  }, [authOpen, t.googleLoginFailed]);

  useEffect(() => {
    if (activeModule !== "portfolio") {
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
          setPortfolioError(data.error || t.loadPortfolioFailed);
          setPortfolioItems([]);
          return;
        }

        setPortfolioItems(data.generations ?? []);
      } catch {
        setPortfolioError(t.loadPortfolioFailed);
        setPortfolioItems([]);
      } finally {
        setPortfolioLoading(false);
      }
    }

    loadPortfolio();
  }, [activeModule, authUser, t.loadPortfolioFailed, t.portfolioLoginHint]);

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
          setBillingError(data.error || t.packageLoadFailed);
          return;
        }

        setBillingPackages(data.packages ?? []);
      } catch {
        setBillingError(t.packageLoadFailed);
      } finally {
        setBillingLoading(false);
      }
    }

    loadPackages();
  }, [billingOpen, billingPackages.length, t.packageLoadFailed]);

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
        body: JSON.stringify({ packageId }),
      });
      const data = await response.json();

      if (!response.ok || !data.url) {
        setBillingError(data.error || t.checkoutFailed);
        return;
      }

      window.location.href = data.url;
    } catch {
      setBillingError(t.checkoutFailed);
    } finally {
      setBillingLoading(false);
    }
  }

  function handleGoogleLogin() {
    if (!GOOGLE_CLIENT_ID) {
      setAuthError(t.googleConfigMissing);
      return;
    }

    if (!window.google?.accounts?.id) {
      setAuthError(t.googleLoginFailed);
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
          setAuthError(data.error || t.userExists);
          return;
        }

        saveSession(data.user as AuthUser);
        setAuthOpen(false);
      } catch {
        setAuthError(t.requestError);
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
        setAuthError(data.error || t.invalidLogin);
        return;
      }

      saveSession(data.user as AuthUser);
      setAuthOpen(false);
    } catch {
      setAuthError(t.requestError);
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setError(t.loginExpiredError);
          setAuthUser(null);
          openAuth("login");
        } else if (response.status === 402) {
          setError(t.insufficientPoints);
        } else if (response.status === 413) {
          setError(t.uploadTooLarge);
        } else if (response.status === 429) {
          setError(t.rateLimitError);
        } else if (response.status >= 500) {
          setError(data.error || t.serverConfigError);
        } else {
          setError(data.error || t.failedError);
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
      setError(t.requestError);
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
      setPortfolioError(t.deletePortfolioFailed);
    }
  }

  return (
    <main className="min-h-screen bg-[#10131f] text-[#eadfca]">
      <nav className="relative border-b border-[#6f5732] bg-[#171b2b] text-[#eadfca] shadow-[0_8px_28px_rgba(0,0,0,0.35)]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-4 sm:px-8 lg:px-10 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-5">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c69a4a]">
                {t.appName}
              </p>
              <h1 className="text-2xl font-bold tracking-normal text-[#fff2d4]">
                {t.title}
              </h1>
            </div>

            <div className="flex rounded-lg border border-[#6f5732] bg-[#0e1220] p-1">
              <button
                type="button"
                onClick={() => setActiveModule("character")}
                className={`h-9 rounded-md px-4 text-sm font-semibold transition ${
                  activeModule === "character"
                    ? "bg-[#b88a3d] text-[#10131f]"
                    : "text-[#eadfca] hover:bg-[#242b43]"
                }`}
              >
                {t.character}
              </button>
              <button
                type="button"
                onClick={() => setActiveModule("portfolio")}
                className={`h-9 rounded-md px-4 text-sm font-semibold transition ${
                  activeModule === "portfolio"
                    ? "bg-[#b88a3d] text-[#10131f]"
                    : "text-[#eadfca] hover:bg-[#242b43]"
                }`}
              >
                {t.portfolio}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {authUser ? (
              <div className="flex items-center gap-2">
                <div className="flex h-10 items-center gap-2 rounded-full border border-[#8d6f37] bg-[#1d1924] px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <span className="rounded-full border border-[#b88a3d] bg-[#3a2a1a] px-2 py-0.5 text-[10px] font-bold uppercase text-[#f0c36e]">
                    {t.points}
                  </span>
                  <span className="text-sm font-bold text-[#f0c36e]">
                    {authUser.points}
                  </span>
                  <span className="h-4 w-px bg-[#6f5732]" />
                  <button
                    type="button"
                    onClick={openBilling}
                    className="rounded-full px-1.5 py-0.5 text-xs font-bold text-[#fff2d4] transition hover:bg-[#3a1f2b] hover:text-[#f0c36e]"
                  >
                    {t.recharge}
                  </button>
                </div>
                <div className="flex h-12 items-center gap-3 rounded-lg border border-[#6f5732] bg-[#0e1220] px-3">
                  <p className="max-w-32 truncate text-sm font-semibold text-[#fff2d4]">
                    {authUser.username}
                  </p>
                  <button
                    type="button"
                    onClick={logout}
                    className="rounded-md border border-[#6f5732] px-2 py-1 text-xs font-semibold text-[#eadfca] transition hover:border-[#b88a3d]"
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
                  className="h-10 rounded-lg border border-[#6f5732] bg-[#0e1220] px-4 text-sm font-semibold text-[#fff2d4] transition hover:border-[#4aa394]"
                >
                  {t.login}
                </button>
                <button
                  type="button"
                  onClick={() => openAuth("register")}
                  className="h-10 rounded-lg bg-[#8f3a35] px-4 text-sm font-bold text-[#fff2d4] transition hover:bg-[#a8443d]"
                >
                  {t.register}
                </button>
              </div>
            )}

            <label className="flex h-10 items-center gap-2 rounded-lg border border-[#6f5732] bg-[#0e1220] px-3 text-sm text-[#d8cbb5] xl:absolute xl:right-8 xl:top-4">
              <span>{t.language}</span>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value as Language)}
                className="h-8 rounded-md border border-[#6f5732] bg-[#171b2b] px-2 text-sm font-semibold text-[#fff2d4] outline-none transition focus:border-[#4aa394]"
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>
        </div>
      </nav>

      <div className="mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-7xl flex-col gap-6 px-5 py-6 sm:px-8 lg:px-10">
        {paymentMessage && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-[#4aa394] bg-[#102621] p-3 text-sm font-semibold text-[#a7f0df]">
            <span>{paymentMessage}</span>
            <button
              type="button"
              onClick={() => setPaymentMessage("")}
              className="rounded-md border border-[#4aa394] px-2 py-1 text-xs text-[#dffcf5] transition hover:bg-[#17372f]"
            >
              {t.close}
            </button>
          </div>
        )}

        {activeModule === "character" ? (
          <>
            <header className="border-b border-[#3a3140] pb-5">
              <p className="max-w-3xl text-sm leading-6 text-[#b8aa92] sm:text-base">
                {typedIntro}
                <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-[#c69a4a]" />
              </p>
            </header>

            <section className="grid flex-1 gap-6 xl:grid-cols-[minmax(0,760px)_minmax(420px,1fr)]">
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="flex flex-col gap-2 rounded-lg border border-[#6f5732] bg-[#171b2b] p-4">
                    <label className="text-sm font-semibold text-[#eadfca]" htmlFor="desc">
                      {t.label}
                    </label>
                    <textarea
                      id="desc"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder={t.placeholder}
                      className="min-h-[312px] w-full flex-1 resize-none rounded-lg border border-[#6f5732] bg-[#0e1220] p-4 text-base leading-7 text-[#fff2d4] outline-none transition placeholder:text-[#7f735f] focus:border-[#4aa394]"
                    />
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="rounded-lg border border-[#6f5732] bg-[#171b2b] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#eadfca]">
                            {t.upload} <span className="text-xs font-medium text-[#9f927d]">({t.optional})</span>
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#9f927d]">{t.uploadHint}</p>
                        </div>
                        <span className="shrink-0 rounded-md border border-[#b88a3d] bg-[#3a2818] px-2.5 py-1 text-xs font-bold text-[#f0c36e]">
                          {t.referenceExtraCost}
                        </span>
                        {characterReferenceImage && (
                          <button
                            type="button"
                            onClick={() => setCharacterReferenceImage("")}
                            className="rounded-md border border-[#6f5732] px-3 py-1 text-xs font-semibold text-[#eadfca] transition hover:border-[#b88a3d]"
                          >
                            {t.removeImage}
                          </button>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <label className="inline-flex h-10 cursor-pointer items-center rounded-lg bg-[#8f3a35] px-4 text-sm font-bold text-[#fff2d4] transition hover:bg-[#a8443d]">
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
                            className="h-16 w-16 rounded-md border border-[#6f5732] object-cover"
                          />
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-[#6f5732] bg-[#171b2b] p-4">
                      <div>
                        <p className="text-sm font-semibold text-[#eadfca]">
                          {t.styleTemplate}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#9f927d]">{t.styleHint}</p>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          aria-label={t.noTemplate}
                          onClick={() => setStyleTemplate("none")}
                          className={`flex min-h-40 flex-col rounded-lg border p-3 text-left transition ${
                            styleTemplate === "none"
                              ? "border-[#b88a3d] bg-[#241d23] shadow-[0_0_0_1px_rgba(240,195,110,0.18)]"
                              : "border-[#46384a] bg-[#0e1220] hover:border-[#6f5732]"
                          }`}
                        >
                          <div className="flex flex-1 flex-col justify-between">
                            <div>
                              <span className="text-sm font-semibold text-[#fff2d4]">
                                {t.noTemplate}
                              </span>
                            </div>
                          </div>
                        </button>
                        {styleTemplateOptions.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            aria-label={option[language]}
                            onClick={() => setStyleTemplate(option.id)}
                            className={`flex min-h-40 flex-col rounded-lg border p-3 text-left transition ${
                              styleTemplate === option.id
                                ? "border-[#b88a3d] bg-[#241d23] shadow-[0_0_0_1px_rgba(240,195,110,0.18)]"
                                : "border-[#46384a] bg-[#0e1220] hover:border-[#6f5732]"
                            }`}
                          >
                            <div className="flex flex-1 flex-col justify-between gap-3">
                              <div className="rounded-md bg-[#eadfca] p-2">
                                <Image
                                  src={option.image}
                                  alt={option[language]}
                                  width={96}
                                  height={96}
                                  unoptimized
                                  className="aspect-square w-full rounded object-contain"
                                  style={{ imageRendering: "pixelated" }}
                                />
                              </div>
                              <div className="flex justify-center">
                                <span className="inline-flex rounded-md border border-[#b88a3d] bg-[#3a2818] px-2.5 py-1 text-xs font-bold text-[#f0c36e] shadow-[0_0_12px_rgba(240,195,110,0.12)]">
                                  {t.templateExtraCost}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={generateCharacter}
                  disabled={loading || !canGenerate}
                  className="h-12 rounded-lg bg-[#8f3a35] px-5 text-base font-bold text-[#fff2d4] transition hover:bg-[#a8443d] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? t.generating : `${t.generate} (${generationCost} Point)`}
                </button>

                {error && (
                  <p className="rounded-lg border border-[#8f3a35] bg-[#2a1720] p-3 text-sm text-[#ffb1a8]">
                    {error}
                  </p>
                )}

                <div className="flex items-center gap-3">
                  <div className="min-h-28 flex-1 rounded-lg border border-[#6f5732] bg-[#171b2b] p-4">
                    <p className="text-sm leading-6 text-[#b8aa92]">
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

              <div className="flex min-h-[500px] items-center justify-center rounded-lg border border-[#6f5732] bg-[#171b2b] p-6">
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
                        className="rounded-lg border border-[#6f5732] bg-[#0e1220] px-4 py-2 text-sm font-semibold text-[#fff2d4] transition hover:border-[#4aa394]"
                      >
                        {t.download}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsImageFlipped((flipped) => !flipped)}
                        className="rounded-lg border border-[#6f5732] bg-[#0e1220] px-4 py-2 text-sm font-semibold text-[#fff2d4] transition hover:border-[#4aa394]"
                      >
                        {t.flipHorizontal}
                      </button>
                      <button
                        type="button"
                        onClick={copyGeneratedImage}
                        className="rounded-lg border border-[#6f5732] bg-[#0e1220] px-4 py-2 text-sm font-semibold text-[#fff2d4] transition hover:border-[#4aa394]"
                      >
                        {copied ? t.copied : t.copy}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-sm text-[#9f927d]">
                    {t.emptyResult}
                  </div>
                )}
              </div>
            </section>
          </>
        ) : activeModule === "animation" ? (
          <section className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
            <div className="rounded-lg border border-[#6f5732] bg-[#171b2b] p-5">
              <h2 className="text-xl font-bold text-[#fff2d4]">
                {t.animationTitle}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#b8aa92]">
                {t.animationIntro}
              </p>
            </div>
            <div className="flex min-h-[560px] items-center justify-center rounded-lg border border-[#6f5732] bg-[#171b2b] p-6">
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
        ) : (
          <section className="flex flex-1 flex-col gap-5">
            <div className="rounded-lg border border-[#6f5732] bg-[#171b2b] p-5">
              <h2 className="text-xl font-bold text-[#fff2d4]">
                {t.portfolioTitle}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#b8aa92]">
                {t.portfolioIntro}
              </p>
            </div>

            {portfolioError && (
              <p className="rounded-lg border border-[#8f3a35] bg-[#2a1720] p-3 text-sm text-[#ffb1a8]">
                {portfolioError}
              </p>
            )}

            {portfolioLoading ? (
              <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-[#6f5732] bg-[#171b2b] text-sm text-[#9f927d]">
                {language === "zh" ? "加载中..." : "Loading..."}
              </div>
            ) : portfolioItems.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {portfolioItems.map((item) => (
                  <article
                    key={item.id}
                    className="group relative rounded-lg border border-[#6f5732] bg-[#171b2b] p-3"
                  >
                    <div className="flex aspect-square items-center justify-center rounded-md border border-[#46384a] bg-[#0e1220] p-3">
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
                      className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-lg border border-[#6f5732] bg-[#0e1220]/90 text-sm font-bold text-[#fff2d4] opacity-100 shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition hover:border-[#4aa394] sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                    >
                      ↓
                    </a>
                    <button
                      type="button"
                      onClick={() => void deletePortfolioImage(item.id)}
                      aria-label={t.delete}
                      className="absolute right-5 top-16 rounded-lg border border-[#6f5732] bg-[#0e1220]/90 px-3 py-2 text-xs font-bold text-[#ffb1a8] opacity-100 shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition hover:border-[#8f3a35] hover:bg-[#2a1720] sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                    >
                      {t.delete}
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-[#6f5732] bg-[#171b2b] text-sm text-[#9f927d]">
                {t.emptyPortfolio}
              </div>
            )}
          </section>
        )}
      </div>

      {authOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4">
          <div className="w-full max-w-md rounded-lg border border-[#6f5732] bg-[#171b2b] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#fff2d4]">
                  {authMode === "login" ? t.loginTitle : t.registerTitle}
                </h2>
                <p className="mt-1 text-xs leading-5 text-[#9f927d]">
                  {t.localAuthNote}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAuthOpen(false)}
                className="h-8 w-8 rounded-md border border-[#6f5732] text-sm font-bold text-[#eadfca] transition hover:border-[#b88a3d]"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="mt-5">
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
                <label className="flex flex-col gap-1 text-sm font-semibold text-[#eadfca]">
                  {t.username}
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="h-11 rounded-lg border border-[#6f5732] bg-[#0e1220] px-3 text-sm text-[#fff2d4] outline-none transition placeholder:text-[#7f735f] focus:border-[#4aa394]"
                  />
                </label>
              )}

              <label className="flex flex-col gap-1 text-sm font-semibold text-[#eadfca]">
                {t.email}
                <input
                  type="text"
                  inputMode="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 rounded-lg border border-[#6f5732] bg-[#0e1220] px-3 text-sm text-[#fff2d4] outline-none transition placeholder:text-[#7f735f] focus:border-[#4aa394]"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-semibold text-[#eadfca]">
                {t.password}
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 rounded-lg border border-[#6f5732] bg-[#0e1220] px-3 text-sm text-[#fff2d4] outline-none transition placeholder:text-[#7f735f] focus:border-[#4aa394]"
                />
              </label>

              {authMode === "register" && (
                <label className="flex flex-col gap-1 text-sm font-semibold text-[#eadfca]">
                  {t.confirmPassword}
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-11 rounded-lg border border-[#6f5732] bg-[#0e1220] px-3 text-sm text-[#fff2d4] outline-none transition placeholder:text-[#7f735f] focus:border-[#4aa394]"
                  />
                </label>
              )}

              {authError && (
                <p className="rounded-lg border border-[#8f3a35] bg-[#2a1720] p-3 text-sm text-[#ffb1a8]">
                  {authError}
                </p>
              )}

              <button
                type="submit"
                className="mt-1 h-11 rounded-lg bg-[#8f3a35] text-sm font-bold text-[#fff2d4] transition hover:bg-[#a8443d]"
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
              className="mt-4 w-full text-center text-sm font-semibold text-[#c69a4a] transition hover:text-[#f0c36e]"
            >
              {authMode === "login" ? t.switchToRegister : t.switchToLogin}
            </button>
          </div>
        </div>
      )}

      {billingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4">
          <div className="w-full max-w-lg rounded-lg border border-[#6f5732] bg-[#171b2b] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#fff2d4]">
                  {t.rechargeTitle}
                </h2>
                <p className="mt-1 text-xs leading-5 text-[#9f927d]">
                  {t.rechargeIntro}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBillingOpen(false)}
                className="h-8 w-8 rounded-md border border-[#6f5732] text-sm font-bold text-[#eadfca] transition hover:border-[#b88a3d]"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              {billingPackages.map((pointPackage) => {
                const packageArt = billingPackageArt[pointPackage.id];

                return (
                  <button
                    key={pointPackage.id}
                    type="button"
                    disabled={billingLoading}
                    onClick={() => startCheckout(pointPackage.id)}
                    className="grid min-h-24 grid-cols-[1fr_auto_auto] items-center gap-4 rounded-lg border border-[#6f5732] bg-[#0e1220] p-4 text-left transition hover:border-[#4aa394] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span>
                      <span className="block text-base font-bold text-[#fff2d4]">
                        {language === "zh" ? pointPackage.zhName : pointPackage.enName}
                      </span>
                      <span className="mt-1 block text-xs text-[#9f927d]">
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
                      <span className="block text-base font-bold text-[#f0c36e]">
                        ${(pointPackage.amountCents / 100).toFixed(2).toUpperCase()}
                      </span>
                      <span className="mt-1 block text-xs text-[#9f927d]">
                        {billingLoading ? t.checkoutLoading : t.checkout}
                      </span>
                    </span>
                  </button>
                );
              })}

              {billingLoading && billingPackages.length === 0 && (
                <div className="rounded-lg border border-[#46384a] bg-[#0e1220] p-4 text-sm text-[#9f927d]">
                  {language === "zh" ? "加载中..." : "Loading..."}
                </div>
              )}

              {billingError && (
                <p className="rounded-lg border border-[#8f3a35] bg-[#2a1720] p-3 text-sm text-[#ffb1a8]">
                  {billingError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      <footer className="px-6 pb-6 text-center text-xs text-[#7f735f]">
        <a href="/terms" className="transition hover:text-[#c69a4a]">
          {t.legalLinks}
        </a>
      </footer>
    </main>
  );
}
