import { zodResolver } from "@hookform/resolvers/zod";
import { type SubmitHandler, useForm } from "react-hook-form";
import * as z from "zod";

const RecurrencePatternSchema = z.object({
	frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
	interval: z.number().min(1),
	daysOfWeek: z.array(z.number()).optional(),
});

const activitySchema = z.object({
	title: z.string().min(1, "Title is required").max(100),
	startTime: z.string().optional(),
	duration: z.number().optional(),
	priority: z.enum(["low", "medium", "high"]),
	replaceabilityStatus: z.enum(["HARD", "SOFT"]),
	category: z.string().optional(),
	isRecurring: z.boolean(),
	recurrencePattern: RecurrencePatternSchema.optional(),
});

export type ActivityFormData = z.infer<typeof activitySchema>;
export type ActivityFormInput = z.input<typeof activitySchema>;

interface UseActivityValidationProps {
	defaultValues?: Partial<ActivityFormData>;
	onSubmit: (data: ActivityFormData) => void;
}

export const useActivityValidation = ({
	defaultValues,
	onSubmit,
}: UseActivityValidationProps) => {
	const {
		control,
		handleSubmit,
		formState: { errors, isValid, isSubmitting },
		reset,
		setValue,
		watch,
	} = useForm<ActivityFormInput, undefined, ActivityFormData>({
		resolver: zodResolver(activitySchema),
		defaultValues: {
			title: "",
			startTime: "",
			duration: 60,
			priority: "medium",
			replaceabilityStatus: "SOFT",
			category: "Other",
			isRecurring: false,
			...defaultValues,
		} as ActivityFormInput,
		mode: "onChange",
	});

	const onFormSubmit: SubmitHandler<ActivityFormData> = (data) => {
		onSubmit(data);
	};

	return {
		control,
		handleSubmit: handleSubmit(onFormSubmit),
		errors,
		isValid,
		isSubmitting,
		reset,
		setValue,
		watch,
	};
};
