import React from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";
import { colors } from "../theme";
import type { CausalNetEdge, CausalNetNode } from "../types";

type Props = {
	nodes: CausalNetNode[];
	edges: CausalNetEdge[];
	width?: number;
	height?: number;
};

const ACT_W = 72;
const ACT_H = 28;
const ACT_RX = 6;

export function CausalNetView({
	nodes,
	edges,
	width: propWidth,
	height: propHeight,
}: Props) {
	const { width: winW } = useWindowDimensions();

	// Calculate bounding box dynamically so we don't clip dynamic layouts
	const minX = Math.min(...nodes.map((n) => n.x - ACT_W), 0);
	const maxX = Math.max(...nodes.map((n) => n.x + ACT_W), 340);
	const minY = Math.min(...nodes.map((n) => n.y - ACT_H), 0);
	const maxY = Math.max(...nodes.map((n) => n.y + ACT_H), 140);

	const VIEW_W = maxX - minX;
	const VIEW_H = maxY - minY;

	const maxW = Math.min(propWidth ?? VIEW_W, winW - 48);
	const w = maxW;
	const h = propHeight ?? Math.round((VIEW_H / VIEW_W) * w);

	const nodeMap = new Map(nodes.map((n) => [n.id, n]));

	if (nodes.length === 0) {
		return (
			<View
				style={[
					styles.wrap,
					{ width: w, maxWidth: "100%", paddingVertical: 20 },
				]}
			>
				<Text style={styles.caption}>No flow data yet.</Text>
			</View>
		);
	}

	return (
		<View style={[styles.wrap, { width: w, maxWidth: "100%" }]}>
			<Svg
				width={w}
				height={h}
				viewBox={`${minX} ${minY} ${VIEW_W} ${VIEW_H}`}
				preserveAspectRatio="xMidYMid meet"
			>
				{/* Arcs */}
				{edges.map((arc, i) => {
					const nodeFrom = nodeMap.get(arc.from);
					const nodeTo = nodeMap.get(arc.to);
					if (!nodeFrom || !nodeTo) return null;
					return (
						<Line
							key={`edge-${arc.from}-${arc.to}`}
							x1={nodeFrom.x}
							y1={nodeFrom.y}
							x2={nodeTo.x}
							y2={nodeTo.y}
							stroke={colors.slate600}
							strokeWidth={1.5}
							markerEnd="url(#arrowhead)"
						/>
					);
				})}
				{/* Nodes (rounded rectangles + labels) */}
				{nodes.map((act) => (
					<React.Fragment key={act.id}>
						<Rect
							x={act.x - ACT_W / 2}
							y={act.y - ACT_H / 2}
							width={ACT_W}
							height={ACT_H}
							rx={ACT_RX}
							ry={ACT_RX}
							fill={colors.white}
							stroke={colors.peachDark}
							strokeWidth={1.5}
						/>
						<SvgText
							x={act.x}
							y={act.y}
							dy=".35em"
							fill={colors.slate700}
							fontSize={10}
							fontWeight="600"
							textAnchor="middle"
						>
							{act.activityLabel.length > 11
								? `${act.activityLabel.substring(0, 10)}...`
								: act.activityLabel}
						</SvgText>
					</React.Fragment>
				))}
			</Svg>
			{nodes.length > 1 ? (
				<Text style={styles.caption}>
					Markov transitions map showing how your activities flow into each
					other based on actual history.
				</Text>
			) : (
				<Text style={styles.caption}>
					Log more activities sequentially to see the dependency graph grow.
				</Text>
			)}
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
