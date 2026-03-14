import { useEffect } from "react";

/**
 * Hook to register notification listeners for navigation or actions.
 */
export function useNotificationListener(navigation: any) {
	useEffect(() => {
		const Notifications = require("expo-notifications");
		const subscription = Notifications.addNotificationResponseReceivedListener(
			(response: any) => {
				const data = response.notification.request.content.data;
				const actionIdentifier = response.actionIdentifier;

				if (actionIdentifier === "ACTION_DELAY") {
					try {
						// Lazy-load to prevent evaluation crash if registration failed
						const solverModule = require("../solver/solver_orchestrator");
						if (solverModule && solverModule.solverOrchestrator) {
							solverModule.solverOrchestrator.delayActivity(
								data.activityId,
								30,
							);
						} else {
							console.error(
								"[Notification] solverOrchestrator module not found or failed to load",
							);
						}
					} catch (err) {
						console.error("[Notification] Failed to delay activity:", err);
					}
					return;
				}

				if (actionIdentifier === "ACTION_STARTED") {
					// Mark as started/completed in DB
					const {
						toggleActivityCompletion,
					} = require("../../app/data/services/homeService");
					toggleActivityCompletion(new Date(), data.activityId);
					return;
				}

				if (
					data.type === "UPCOMING_ACTIVITY" ||
					data.type === "ACTIVITY_START_INQUIRY"
				) {
					// Navigate to the specific activity screen
					navigation.navigate("ActivityDetail", { id: data.activityId });
				} else if (data.type === "RETROSPECTIVE_REVIEW") {
					// Navigate to retrospective screen
					navigation.navigate("Retrospective");
				}
			},
		);

		return () => subscription.remove();
	}, [navigation]);
}
