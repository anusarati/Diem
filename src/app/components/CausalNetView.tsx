import React from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Line, Rect, Text as SvgText } from "react-native-svg";
import { colors } from "../theme";
import type { CausalNetEdge, CausalNetNode } from "../types";

type Props = {
	nodes: CausalNetNode[];
	edges: CausalNetEdge[];
	width?: number;
	height?: number;
};

/** Hard-coded C-net (Causal net) to show intended look: places (black dots), activities (rounded rects), directed arcs. */
const VIEW_W = 340;
const VIEW_H = 140;
const PLACE_R = 5;
const ACT_W = 52;
const ACT_H = 28;
const ACT_RX = 6;

const places = [
	{ id: "p0", x: 24, y: 70 },
	{ id: "p1a", x: 120, y: 40 },
	{ id: "p1b", x: 120, y: 70 },
	{ id: "p1c", x: 120, y: 100 },
	{ id: "p2a", x: 216, y: 40 },
	{ id: "p2b", x: 216, y: 70 },
	{ id: "p2c", x: 216, y: 100 },
	{ id: "p3", x: 316, y: 70 },
] as const;

const activities = [
	{ id: "a", x: 72, y: 70, label: "a: plan day" },
	{ id: "b", x: 168, y: 40, label: "b: deep work" },
	{ id: "c", x: 168, y: 70, label: "c: meetings" },
	{ id: "d", x: 168, y: 100, label: "d: review" },
	{ id: "e", x: 264, y: 70, label: "e: wrap up" },
] as const;

/** Arcs: from place/activity center to another. Draw line from (x1,y1) to (x2,y2). */
const arcs: { x1: number; y1: number; x2: number; y2: number }[] = [
	{ x1: places[0].x, y1: places[0].y, x2: 72 - ACT_W / 2, y2: 70 },
	{ x1: 72 + ACT_W / 2, y1: 70, x2: places[1].x, y2: places[1].y },
	{ x1: 72 + ACT_W / 2, y1: 70, x2: places[2].x, y2: places[2].y },
	{ x1: 72 + ACT_W / 2, y1: 70, x2: places[3].x, y2: places[3].y },
	{ x1: places[1].x, y1: places[1].y, x2: 168 - ACT_W / 2, y2: 40 },
	{ x1: places[2].x, y1: places[2].y, x2: 168 - ACT_W / 2, y2: 70 },
	{ x1: places[3].x, y1: places[3].y, x2: 168 - ACT_W / 2, y2: 100 },
	{ x1: 168 + ACT_W / 2, y1: 40, x2: places[4].x, y2: places[4].y },
	{ x1: 168 + ACT_W / 2, y1: 70, x2: places[5].x, y2: places[5].y },
	{ x1: 168 + ACT_W / 2, y1: 100, x2: places[6].x, y2: places[6].y },
	{ x1: places[4].x, y1: places[4].y, x2: 264 - ACT_W / 2, y2: 70 },
	{ x1: places[5].x, y1: places[5].y, x2: 264 - ACT_W / 2, y2: 70 },
	{ x1: places[6].x, y1: places[6].y, x2: 264 - ACT_W / 2, y2: 70 },
	{ x1: 264 + ACT_W / 2, y1: 70, x2: places[7].x, y2: places[7].y },
];

export function CausalNetView({ width: propWidth, height: propHeight }: Props) {
	const { width: winW } = useWindowDimensions();
	const maxW = Math.min(propWidth ?? VIEW_W, winW - 48);
	const w = maxW;
	const h = propHeight ?? Math.round((VIEW_H / VIEW_W) * w);

	return (
		<View style={[styles.wrap, { width: w, maxWidth: "100%" }]}>
			<Svg
				width={w}
				height={h}
				viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
				preserveAspectRatio="xMidYMid meet"
			>
				{/* Arcs */}
				{arcs.map((arc, i) => (
					<Line
						key={`arc-${arc.x1}-${arc.y1}-${arc.x2}-${arc.y2}-${i}`}
						x1={arc.x1}
						y1={arc.y1}
						x2={arc.x2}
						y2={arc.y2}
						stroke={colors.slate600}
						strokeWidth={1.5}
					/>
				))}
				{/* Places (black circles) */}
				{places.map((p) => (
					<Circle
						key={p.id}
						cx={p.x}
						cy={p.y}
						r={PLACE_R}
						fill={colors.slate800}
					/>
				))}
				{/* Activities (rounded rectangles + labels) */}
				{activities.map((act) => (
					<React.Fragment key={act.id}>
						<Rect
							x={act.x - ACT_W / 2}
							y={act.y - ACT_H / 2}
							width={ACT_W}
							height={ACT_H}
							rx={ACT_RX}
							ry={ACT_RX}
							fill={colors.white}
							stroke={colors.slate600}
							strokeWidth={1.5}
						/>
						<SvgText
							x={act.x}
							y={act.y}
							dy=".35em"
							fill={colors.slate700}
							fontSize={9}
							fontWeight="600"
							textAnchor="middle"
						>
							{act.label}
						</SvgText>
					</React.Fragment>
				))}
			</Svg>
			<Text style={styles.caption}>
				Example workflow: plan day → parallel tasks (deep work, meetings,
				review) → wrap up. With more data, this will reflect your real task
				dependencies.
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		alignSelf: "center",
		marginVertical: 8,
		overflow: "hidden",
	},
	caption: {
		fontSize: 10,
		color: colors.slate400,
		marginTop: 8,
		textAlign: "center",
		paddingHorizontal: 8,
	},
});
