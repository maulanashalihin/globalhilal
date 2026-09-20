/**
 * Page registry. Explicit imports work identically in the Bun server
 * runtime and the Bun.build client bundle (Bun 1.3 removed
 * `import.meta.glob`). Keys use the `./pages/<Name>.svelte` convention
 * that `resolve()` builds from the Inertia component name.
 */
import type { Component } from "svelte";
import Admin from "./pages/Admin.svelte";
import AdminHijri from "./pages/AdminHijri.svelte";
import AdminHijriDetail from "./pages/AdminHijriDetail.svelte";
import AdminReports from "./pages/AdminReports.svelte";
import Calendar from "./pages/Calendar.svelte";
import Contribute from "./pages/Contribute.svelte";
import Dashboard from "./pages/Dashboard.svelte";
import Docs from "./pages/Docs.svelte";
import ForgotPassword from "./pages/ForgotPassword.svelte";
import Home from "./pages/Home.svelte";
import Login from "./pages/Login.svelte";
import Methodology from "./pages/Methodology.svelte";
import MonthDetail from "./pages/MonthDetail.svelte";
import NotFound from "./pages/NotFound.svelte";
import Profile from "./pages/Profile.svelte";
import Register from "./pages/Register.svelte";
import ResetPassword from "./pages/ResetPassword.svelte";
import Sources from "./pages/Sources.svelte";
import Today from "./pages/Today.svelte";

type PageModule = { default: Component<any> };

export const pages: Record<string, PageModule> = {
	"./pages/Admin.svelte": { default: Admin },
	"./pages/AdminHijri.svelte": { default: AdminHijri },
	"./pages/AdminHijriDetail.svelte": { default: AdminHijriDetail },
	"./pages/AdminReports.svelte": { default: AdminReports },
	"./pages/Calendar.svelte": { default: Calendar },
	"./pages/Contribute.svelte": { default: Contribute },
	"./pages/Dashboard.svelte": { default: Dashboard },
	"./pages/Docs.svelte": { default: Docs },
	"./pages/ForgotPassword.svelte": { default: ForgotPassword },
	"./pages/Home.svelte": { default: Home },
	"./pages/Login.svelte": { default: Login },
	"./pages/Methodology.svelte": { default: Methodology },
	"./pages/MonthDetail.svelte": { default: MonthDetail },
	"./pages/NotFound.svelte": { default: NotFound },
	"./pages/Profile.svelte": { default: Profile },
	"./pages/Register.svelte": { default: Register },
	"./pages/ResetPassword.svelte": { default: ResetPassword },
	"./pages/Sources.svelte": { default: Sources },
	"./pages/Today.svelte": { default: Today },
};

/** Fallback for unknown component names — never resolve to undefined. */
export const notFoundPage: PageModule = pages["./pages/NotFound.svelte"] ?? {
	default: NotFound,
};
