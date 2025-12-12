export const defaultSkillUpForm = {
  title: "Skill Up Registration",
  description: "Register for this course",
  fields: [
    {
      id: "fullName",
      type: "text",
      label: "Full Name",
      required: true,
      placeholder: "Enter your full name"
    },
    {
      id: "email",
      type: "email",
      label: "Email Address",
      required: true,
      placeholder: "name@example.com"
    },
    {
      id: "phone",
      type: "tel",
      label: "Phone / WhatsApp Number",
      required: true,
      placeholder: "+234..."
    },
    {
      id: "gender",
      type: "select",
      label: "Gender",
      required: true,
      options: [
        { label: "Male", value: "Male" },
        { label: "Female", value: "Female" }
      ]
    },
    {
      id: "experienceLevel",
      type: "select",
      label: "Experience Level",
      required: true,
      options: [
        { label: "Beginner", value: "Beginner" },
        { label: "Intermediate", value: "Intermediate" },
        { label: "Advanced", value: "Advanced" }
      ]
    },
    {
      id: "expectations",
      type: "textarea",
      label: "What do you hope to learn?",
      required: false,
      placeholder: "Briefly describe your goals..."
    }
  ]
};
