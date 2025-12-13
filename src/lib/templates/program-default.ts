export const defaultProgramForm = {
  title: "Program Registration",
  description: "Register for this program",
  fields: [
    {
      id: "fullName",
      type: "text",
      label: "Full Name",
      required: true,
      placeholder: "Enter your full name",
    },
    {
      id: "email",
      type: "email",
      label: "Email Address",
      required: true,
      placeholder: "name@example.com",
    },
    {
      id: "phone",
      type: "tel",
      label: "Phone / WhatsApp Number",
      required: true,
      placeholder: "+234...",
    },
    {
      id: "gender",
      type: "select",
      label: "Gender",
      required: true,
      options: ["Male", "Female"],
    },
    {
      id: "education",
      type: "select",
      label: "Highest Qualification",
      required: true,
      options: [
        "Secondary School",
        "Undergraduate",
        "Graduate",
        "Postgraduate",
      ],
    },
    {
      id: "location",
      type: "text",
      label: "Location (City, Country)",
      required: true,
      placeholder: "e.g., Lagos, Nigeria",
    },
  ],
};
