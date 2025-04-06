import { useState, useEffect } from "react";
import {
	HashRouter as Router,
	Route,
	Routes,
	useNavigate,
} from "react-router-dom";
import CreatePassword from "./components/CreatePassword";
import Home from "./components/Home";
import Connect from "./components/Connect";
import Sign from "./components/Sign";
import IpfsSettings from "./components/IpfsSettings";
import CreateAccount from "./components/CreateAccount";
import { accountStorage } from "./utils/accountStorage";

import { createRoot } from "react-dom/client";

async function initPopup(): Promise<void> {
	try {
		// 初始化localForage账户存储
		await accountStorage.migrateFromLocalStorage();
		await accountStorage.initializeIfNeeded();
		
		// 渲染应用
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		const container = document.getElementById("popup-root")!;
		const root = createRoot(container);
		root.render(<PopupApp />);
	} catch (error) {
		console.error("初始化应用失败:", error);
	}
}

initPopup().catch(console.error);

// 封装组件：用于展示密码创建页面，点击后跳转到首页
const RootWrapperExtension = ({ children }: { children: React.ReactNode }) => {
	return (
		<div
			style={{
				margin: "0 auto",
				width: "500px",
				minHeight: "400px",
				backgroundColor: "#1c1c1c",
			}}
		>
			{children}
		</div>
	);
};

const RootWrapperPage = ({ children }: { children: React.ReactNode }) => {
	return (
		<div
			style={{
				margin: "0 auto",
				width: "500px",
				height: "80vh",
                backgroundColor: "#1c1c1c",
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
			}}
		>
			{children}
		</div>
	);
};


export default function PopupApp(): JSX.Element {
	return (
		<Router>
			<Routes>
				<Route
					path="/"
					element={
						<RootWrapperExtension>
							<Home />
						</RootWrapperExtension>
					}
				/>
				<Route
					path="/create-password"
					element={
						<RootWrapperExtension>
							<CreatePassword />
						</RootWrapperExtension>
					}
				/>
				<Route
					path="/home"
					element={
						<RootWrapperExtension>
							<Home />
						</RootWrapperExtension>
					}
				/>
				<Route
					path="/connect"
					element={
						<RootWrapperPage>
							<Connect />
						</RootWrapperPage>
					}
				/>
				<Route
					path="/sign"
					element={
						<RootWrapperPage>
							<Sign />
						</RootWrapperPage>
					}
				/>
				<Route
					path="/ipfs-settings"
					element={
						<RootWrapperExtension>
							<IpfsSettings />
						</RootWrapperExtension>
					}
				/>
				<Route
					path="/create-account"
					element={
						<RootWrapperExtension>
							<CreateAccount />
						</RootWrapperExtension>
					}
				/>
			</Routes>
		</Router>
	);
}
