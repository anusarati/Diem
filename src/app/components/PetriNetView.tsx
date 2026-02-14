import React from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Line, Rect } from "react-native-svg";
import { colors } from "../theme";
import type { PetriNetArc, PetriNetPlace, PetriNetTransition } from "../types";

type Props = {
	places: PetriNetPlace[];
	transitions: PetriNetTransition[];
	arcs: PetriNetArc[];
	width?: number;
	height?: number;
};

const PLACE_R = 14;
const TRANSITION_W = 12;
const TRANSITION_H = 28;

function getNodeCoords(
	id: string,
	places: PetriNetPlace[],
	transitions: PetriNetTransition[],
): { x: number; y: number } | null {
	const p = places.find((n) => n.id === id);
	if (p) return { x: p.x, y: p.y };
	const t = transitions.find((n) => n.id === id);
	if (t) return { x: t.x, y: t.y };
	return null;
}

export function PetriNetView({
	places,
	transitions,
	arcs,
	width: propWidth,
	height: propHeight,
}: Props) {
	const { width: winW } = useWindowDimensions();
	const w = propWidth ?? Math.min(winW - 48, 320);
	const h = propHeight ?? 200;

	return (
		<View style={[styles.wrap, { width: w, height: h }]}>
			<Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
				{/* Arcs */}
				{arcs.map((arc) => {
					const from = getNodeCoords(arc.from, places, transitions);
					const to = getNodeCoords(arc.to, places, transitions);
					if (!from || !to) return null;
					return (
						<Line
							key={`arc-${arc.from}-${arc.to}`}
							x1={from.x}
							y1={from.y}
							x2={to.x}
							y2={to.y}
							stroke={colors.slate400}
							strokeWidth={1.5}
						/>
					);
				})}
				{/* Transitions (rectangles) */}
				{transitions.map((t) => (
					<Rect
						key={t.id}
						x={t.x - TRANSITION_W / 2}
						y={t.y - TRANSITION_H / 2}
						width={TRANSITION_W}
						height={TRANSITION_H}
						fill={colors.mintDark}
						stroke={colors.slate600}
						strokeWidth={1}
					/>
				))}
				{/* Places (circles) */}
				{places.map((p) => (
					<React.Fragment key={p.id}>
						<Circle
							cx={p.x}
							cy={p.y}
							r={PLACE_R}
							fill={colors.white}
							stroke={colors.mintDark}
							strokeWidth={2}
						/>
						{p.tokens != null && p.tokens > 0 && (
							<Circle cx={p.x} cy={p.y} r={4} fill={colors.mintDark} />
						)}
					</React.Fragment>
				))}
			</Svg>
			<View style={styles.legend}>
				<View style={styles.legendItem}>
					<View style={styles.legendCircle} />
					<Text style={styles.legendText}>Place</Text>
				</View>
				<View style={styles.legendItem}>
					<View style={styles.legendRect} />
					<Text style={styles.legendText}>Transition</Text>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: { alignSelf: "center", marginVertical: 8 },
	legend: {
		flexDirection: "row",
		justifyContent: "center",
		gap: 16,
		marginTop: 12,
	},
	legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
	legendCircle: {
		width: 12,
		height: 12,
		borderRadius: 6,
		borderWidth: 1.5,
		borderColor: colors.mintDark,
		backgroundColor: colors.white,
	},
	legendRect: {
		width: 8,
		height: 16,
		backgroundColor: colors.mintDark,
		borderRadius: 2,
	},
	legendText: { fontSize: 10, fontWeight: "600", color: colors.slate500 },
});
