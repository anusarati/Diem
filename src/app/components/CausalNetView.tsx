import React from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Line, Text as SvgText } from "react-native-svg";
import { colors } from "../theme";
import type { CausalNetEdge, CausalNetNode } from "../types";

type Props = {
	nodes: CausalNetNode[];
	edges: CausalNetEdge[];
	width?: number;
	height?: number;
};

const NODE_R = 24;
const FONT_SIZE = 10;

function getNodeCoords(
	id: string,
	nodes: CausalNetNode[],
): { x: number; y: number } | null {
	const n = nodes.find((node) => node.id === id);
	return n ? { x: n.x, y: n.y } : null;
}

export function CausalNetView({
	nodes,
	edges,
	width: propWidth,
	height: propHeight,
}: Props) {
	const { width: winW } = useWindowDimensions();
	const w = propWidth ?? Math.min(winW - 48, 320);
	const h = propHeight ?? 220;

	return (
		<View style={[styles.wrap, { width: w, height: h }]}>
			<Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
				{/* Causal edges */}
				{edges.map((edge) => {
					const from = getNodeCoords(edge.from, nodes);
					const to = getNodeCoords(edge.to, nodes);
					if (!from || !to) return null;
					return (
						<Line
							key={`edge-${edge.from}-${edge.to}`}
							x1={from.x}
							y1={from.y}
							x2={to.x}
							y2={to.y}
							stroke={colors.slate400}
							strokeWidth={1.5}
						/>
					);
				})}
				{/* Activity nodes (circle + label) */}
				{nodes.map((node) => (
					<React.Fragment key={node.id}>
						<Circle
							cx={node.x}
							cy={node.y}
							r={NODE_R}
							fill={colors.white}
							stroke={colors.mintDark}
							strokeWidth={2}
						/>
						<SvgText
							x={node.x}
							y={node.y}
							dy=".3em"
							fill={colors.slate700}
							fontSize={FONT_SIZE}
							fontWeight="600"
							textAnchor="middle"
						>
							{node.activityLabel}
						</SvgText>
					</React.Fragment>
				))}
			</Svg>
			<Text style={styles.caption}>
				Nodes = activities; edges = causal links
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: { alignSelf: "center", marginVertical: 8 },
	caption: {
		fontSize: 10,
		color: colors.slate400,
		marginTop: 8,
		textAlign: "center",
	},
});
