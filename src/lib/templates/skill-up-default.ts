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
      options: ["Male", "Female"]
    },
    {
      id: "experienceLevel",
      type: "select",
      label: "Experience Level",
      required: true,
      options: ["Beginner", "Intermediate", "Advanced"]
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
