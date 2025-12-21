"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface TabsProps {
	children: React.ReactNode;
	className?: string;
	activeTab?: number;
	onTabChange?: (index: number) => void;
}

export function Tabs({ children, className, activeTab: controlledActiveTab, onTabChange }: TabsProps) {
	const [internalActiveTab, setInternalActiveTab] = useState(0);
	const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
	const tabRefs = useRef<(HTMLButtonElement | HTMLAnchorElement | null)[]>([]);
	const containerRef = useRef<HTMLDivElement>(null);

	const isControlled = controlledActiveTab !== undefined;
	const activeTab = isControlled ? controlledActiveTab : internalActiveTab;

	const updateIndicator = (index: number) => {
		const tabElement = tabRefs.current[index];
		if (tabElement && containerRef.current) {
			const containerRect = containerRef.current.getBoundingClientRect();
			const tabRect = tabElement.getBoundingClientRect();
			setIndicatorStyle({
				left: tabRect.left - containerRect.left,
				width: tabRect.width,
			});
		}
	};

	useEffect(() => {
		updateIndicator(activeTab);
	}, [activeTab]);

	useEffect(() => {
		const handleResize = () => updateIndicator(activeTab);
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, [activeTab]);

	const handleTabClick = (index: number) => {
		if (!isControlled) {
			setInternalActiveTab(index);
		}
		onTabChange?.(index);
	};

	const tabs = React.Children.toArray(children).filter(
		(child): child is React.ReactElement => React.isValidElement(child)
	);

	return (
		<div ref={containerRef} className={cn("relative flex items-center border-b border-gray-200", className)}>
		{tabs.map((tab, index) => {
			const isActive = index === activeTab;
			const tabElement = tab as React.ReactElement<TabProps>;
			return React.cloneElement(tabElement, {
				key: index,
				active: isActive,
				ref: (el: HTMLButtonElement | HTMLAnchorElement | null) => {
					tabRefs.current[index] = el;
				},
				onClick: () => {
					handleTabClick(index);
					if (tabElement.props.onClick) {
						tabElement.props.onClick();
					}
				},
			} as Partial<TabProps>);
		})}
			<div className="flex-1"></div>
			<div
				className="absolute bottom-0 h-0.5 bg-[#056DFF] transition-all duration-300 ease-in-out"
				style={{
					left: `${indicatorStyle.left}px`,
					width: `${indicatorStyle.width}px`,
				}}
			/>
		</div>
	);
}

export interface TabProps {
	children: React.ReactNode;
	active?: boolean;
	href?: string;
	onClick?: () => void;
	className?: string;
}

export const Tab = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, TabProps>(
	({ children, active = false, href, onClick, className }, ref) => {
		const baseClasses = "relative inline-flex items-center px-4 py-3 text-sm transition-colors z-10";

		const activeClasses = active
			? "text-gray-900 font-medium"
			: "text-gray-600 hover:text-gray-900";

		const content = (
			<>
				<span className="sr-only">{children}</span>
				<span className={cn(active && "font-medium")} data-testid={active ? "active-tab" : undefined}>
					{children}
				</span>
			</>
		);

		if (href) {
			return (
				<a
					ref={ref as React.Ref<HTMLAnchorElement>}
					href={href}
					className={cn(baseClasses, activeClasses, className)}
					onClick={onClick}
				>
					{content}
				</a>
			);
		}

		return (
			<button
				ref={ref as React.Ref<HTMLButtonElement>}
				type="button"
				onClick={onClick}
				className={cn(baseClasses, activeClasses, className)}
			>
				{content}
			</button>
		);
	}
);

Tab.displayName = "Tab";
