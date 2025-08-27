"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Download,
  Edit,
  Loader2,
  Monitor,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import MDEditor from "@uiw/react-md-editor";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { saveResume } from "@/actions/resume";
import { EntryForm } from "./entry-form"; // Corrected import statement
import useFetch from "@/hooks/use-fetch";
import { useUser } from "@clerk/nextjs";
import { entriesToMarkdown } from "@/app/lib/helper";
import { resumeSchema } from "@/app/lib/schema";
// import html2pdf from "html2pdf.js/dist/html2pdf.min.js"; // This import is correctly commented out as you're doing a dynamic import

export default function ResumeBuilder({ initialContent }) {
  const [activeTab, setActiveTab] = useState("edit");
  const [previewContent, setPreviewContent] = useState(initialContent);
  const { user } = useUser();
  const [resumeMode, setResumeMode] = useState("preview");

  // State to manage inline styles for MDEditor.Markdown during PDF generation
  const [markdownInlineStyle, setMarkdownInlineStyle] = useState({
    background: "white",
    color: "black",
  });

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resumeSchema),
    defaultValues: {
      contactInfo: {},
      summary: "",
      skills: "",
      experience: [],
      education: [],
      projects: [],
    },
  });

  const {
    loading: isSaving,
    fn: saveResumeFn,
    data: saveResult,
    error: saveError,
  } = useFetch(saveResume);

  // Watch form fields for preview updates
  const formValues = watch();

  useEffect(() => {
    if (initialContent) setActiveTab("preview");
  }, [initialContent]);

  // Update preview content when form values change
  useEffect(() => {
    if (activeTab === "edit") {
      const newContent = getCombinedContent();
      setPreviewContent(newContent ? newContent : initialContent);
    }
  }, [formValues, activeTab]);

  // Handle save result
  useEffect(() => {
    if (saveResult && !isSaving) {
      toast.success("Resume saved successfully!");
    }
    if (saveError) {
      toast.error(saveError.message || "Failed to save resume");
    }
  }, [saveResult, saveError, isSaving]);

  const getContactMarkdown = () => {
    const { contactInfo } = formValues;
    const parts = [];
    if (contactInfo.email) parts.push(`📧 ${contactInfo.email}`);
    if (contactInfo.mobile) parts.push(`📱 ${contactInfo.mobile}`);
    if (contactInfo.linkedin)
      parts.push(`💼 [LinkedIn](${contactInfo.linkedin})`);
    if (contactInfo.twitter) parts.push(`🐦 [Twitter](${contactInfo.twitter})`);

    return parts.length > 0
      ? `## <div align="center">${user.fullName}</div>
        \n\n<div align="center">\n\n${parts.join(" | ")}\n\n</div>`
      : "";
  };

  const getCombinedContent = () => {
    const { summary, skills, experience, education, projects } = formValues;
    return [
      getContactMarkdown(),
      summary && `## Professional Summary\n\n${summary}`,
      skills && `## Skills\n\n${skills}`,
      entriesToMarkdown(experience, "Work Experience"),
      entriesToMarkdown(education, "Education"),
      entriesToMarkdown(projects, "Projects"),
    ]
      .filter(Boolean)
      .join("\n\n");
  };

  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    const originalActiveTab = activeTab; // Store current active tab

    // Ensure the preview tab is active so the element is in the DOM
    if (activeTab !== "preview") {
      setActiveTab("preview");
      // Wait for React to render the new tab content. Increased delay for robustness.
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    const element = document.getElementById("resume-pdf");
    // Assuming the parent of #resume-pdf is the div with className="hidden"
    const parentOfElement = element ? element.parentElement : null;
    const mainContentDiv = document.querySelector(
      'div[data-color-mode="light"]'
    ); // Get the main content div

    if (!element || !parentOfElement || !mainContentDiv) {
      console.error("PDF generation error: Required elements not found.");
      toast.error(
        "Failed to generate PDF. Essential content not found. Please try again."
      );
      setIsGenerating(false);
      // Attempt to revert tab even if element not found
      if (activeTab !== originalActiveTab) {
        setActiveTab(originalActiveTab);
      }
      return;
    }

    // Store original states to restore later
    const originalBodyClassList = Array.from(document.body.classList);
    const originalElementClassList = Array.from(element.classList);
    const originalParentClassList = Array.from(parentOfElement.classList); // Store parent's classes
    const originalParentStyle = parentOfElement.style.cssText; // Store parent's inline styles
    const originalBodyBackgroundColor = document.body.style.backgroundColor; // Store original body background
    const originalRootBackgroundColorVar =
      document.documentElement.style.getPropertyValue("--background"); // Store original --background CSS variable
    const originalMainContentDivClassList = Array.from(
      mainContentDiv.classList
    ); // Store main content div's classes
    const originalMainContentDivStyle = mainContentDiv.style.cssText; // Store main content div's inline style
    const originalElementBackgroundColor = element.style.backgroundColor; // Store original element background color

    // Temporarily modify the parent container to be off-screen
    parentOfElement.classList.remove("hidden"); // Remove 'hidden' so it's not display: none
    parentOfElement.style.position = "absolute";
    parentOfElement.style.left = "-9999px";
    parentOfElement.style.top = "0"; // Ensure it's off-screen from top as well
    parentOfElement.style.zIndex = "-1"; // Place it behind other content
    parentOfElement.style.width = "210mm"; // Set a fixed width for A4 portrait
    parentOfElement.style.minHeight = "297mm"; // Set a fixed min-height for A4 portrait
    // Explicitly set parentOfElement background to a dark color
    parentOfElement.style.backgroundColor = "rgb(37, 37, 37)";

    // Apply the pdf-fallback class to the body and the target element
    document.body.classList.add("pdf-fallback");
    element.classList.add("pdf-fallback");

    // Explicitly set body background to a dark color to prevent white flash
    document.body.style.backgroundColor = "rgb(37, 37, 37)"; // Dark background like your theme
    // Also override the --background CSS variable on the root for consistency
    document.documentElement.style.setProperty(
      "--background",
      "rgb(37, 37, 37)"
    );

    // Temporarily ensure the main content div also has a dark background
    mainContentDiv.style.backgroundColor = "rgb(37, 37, 37)";
    mainContentDiv.classList.add("pdf-fallback"); // Apply fallback to main div too

    // MOST IMPORTANT: Temporarily set the element's direct background color to dark
    // This is a crucial step to ensure html2canvas has a non-transparent background to capture.
    element.style.backgroundColor = "rgb(37, 37, 37)";

    // Temporarily override MDEditor's inline styles to ensure rgb values are used
    setMarkdownInlineStyle({
      background: "rgb(37, 37, 37)", // Explicitly use rgb for dark background
      color: "rgb(251, 251, 251)", // Explicitly use rgb for light text
    });

    // Add a small delay to ensure styles are fully applied and computed by the browser
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const opt = {
        margin: [15, 15],
        filename: "resume.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: null }, // CRITICAL: Set to null to tell html2canvas NOT to draw its own background
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error(
        "Failed to generate PDF. Error: " +
          error.message +
          " (Hint: Ensure all CSS colors are in compatible formats like rgb/hex during PDF generation.)"
      );
    } finally {
      setIsGenerating(false);
      // Restore original classes and styles
      document.body.className = originalBodyClassList.join(" ");
      element.className = originalElementClassList.join(" ");

      // Restore parent's classes and original inline styles
      parentOfElement.className = originalParentClassList.join(" ");
      parentOfElement.style.cssText = originalParentStyle; // Restore original inline styles

      // Restore original body background
      document.body.style.backgroundColor = originalBodyBackgroundColor;
      // Restore original --background CSS variable
      document.documentElement.style.setProperty(
        "--background",
        originalRootBackgroundColorVar
      );

      // Restore main content div's classes and style
      mainContentDiv.className = originalMainContentDivClassList.join(" ");
      mainContentDiv.style.cssText = originalMainContentDivStyle;

      // Restore original element background color
      element.style.backgroundColor = originalElementBackgroundColor;

      // Restore original MDEditor's inline styles
      setMarkdownInlineStyle({
        background: "white",
        color: "black",
      });

      // Switch back to the original active tab
      if (activeTab !== originalActiveTab) {
        setActiveTab(originalActiveTab);
      }
    }
  };

  const onSubmit = async (data) => {
    try {
      const formattedContent = previewContent
        .replace(/\n/g, "\n") // Normalize newlines
        .replace(/\n\s*\n/g, "\n\n") // Normalize multiple newlines to double newlines
        .trim();

      console.log(previewContent, formattedContent);
      await saveResumeFn(previewContent);
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  return (
    <div data-color-mode="light" className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-center gap-2">
        <h1 className="font-bold gradient-title text-5xl md:text-6xl">
          Resume Builder
        </h1>
        <div className="space-x-2">
          <Button
            variant="destructive"
            onClick={handleSubmit(onSubmit)}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save
              </>
            )}
          </Button>
          <Button onClick={generatePDF} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="edit">Form</TabsTrigger>
          <TabsTrigger value="preview">Markdown</TabsTrigger>
        </TabsList>

        <TabsContent value="edit">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    {...register("contactInfo.email")}
                    type="email"
                    placeholder="your@email.com"
                    error={errors.contactInfo?.email}
                  />
                  {errors.contactInfo?.email && (
                    <p className="text-sm text-red-500">
                      {errors.contactInfo.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mobile Number</label>
                  <Input
                    {...register("contactInfo.mobile")}
                    type="tel"
                    placeholder="+1 234 567 8900"
                  />
                  {errors.contactInfo?.mobile && (
                    <p className="text-sm text-red-500">
                      {errors.contactInfo.mobile.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">LinkedIn URL</label>
                  <Input
                    {...register("contactInfo.linkedin")}
                    type="url"
                    placeholder="https://linkedin.com/in/your-profile"
                  />
                  {errors.contactInfo?.linkedin && (
                    <p className="text-sm text-red-500">
                      {errors.contactInfo.linkedin.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Twitter/X Profile
                  </label>
                  <Input
                    {...register("contactInfo.twitter")}
                    type="url"
                    placeholder="https://twitter.com/your-handle"
                  />
                  {errors.contactInfo?.twitter && (
                    <p className="text-sm text-red-500">
                      {errors.contactInfo.twitter.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Professional Summary</h3>
              <Controller
                name="summary"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    className="h-32"
                    placeholder="Write a compelling professional summary..."
                    error={errors.summary}
                  />
                )}
              />
              {errors.summary && (
                <p className="text-sm text-red-500">{errors.summary.message}</p>
              )}
            </div>

            {/* Skills */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Skills</h3>
              <Controller
                name="skills"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    className="h-32"
                    placeholder="List your key skills..."
                    error={errors.skills}
                  />
                )}
              />
              {errors.skills && (
                <p className="text-sm text-red-500">{errors.skills.message}</p>
              )}
            </div>

            {/* Experience */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Work Experience</h3>
              <Controller
                name="experience"
                control={control}
                render={({ field }) => (
                  <EntryForm
                    type="Experience"
                    entries={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.experience && (
                <p className="text-sm text-red-500">
                  {errors.experience.message}
                </p>
              )}
            </div>

            {/* Education */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Education</h3>
              <Controller
                name="education"
                control={control}
                render={({ field }) => (
                  <EntryForm
                    type="Education"
                    entries={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.education && (
                <p className="text-sm text-red-500">
                  {errors.education.message}
                </p>
              )}
            </div>

            {/* Projects */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Projects</h3>
              <Controller
                name="projects"
                control={control}
                render={({ field }) => (
                  <EntryForm
                    type="Project"
                    entries={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.projects && (
                <p className="text-sm text-red-500">
                  {errors.projects.message}
                </p>
              )}
            </div>
          </form>
        </TabsContent>

        <TabsContent value="preview">
          {activeTab === "preview" && (
            <Button
              variant="link"
              type="button"
              className="mb-2"
              onClick={() =>
                setResumeMode(resumeMode === "preview" ? "edit" : "preview")
              }
            >
              {resumeMode === "preview" ? (
                <>
                  <Edit className="h-4 w-4" />
                  Edit Resume
                </>
              ) : (
                <>
                  <Monitor className="h-4 w-4" />
                  Show Preview
                </>
              )}
            </Button>
          )}

          {activeTab === "preview" && resumeMode !== "preview" && (
            <div className="flex p-3 gap-2 items-center border-2 border-yellow-600 text-yellow-600 rounded mb-2">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm">
                You will lose editied markdown if you update the form data.
              </span>
            </div>
          )}
          <div className="border rounded-lg">
            <MDEditor
              value={previewContent}
              onChange={setPreviewContent}
              height={800}
              preview={resumeMode}
            />
          </div>
          <div className="hidden">
            {" "}
            {/* This div is the parent of #resume-pdf */}
            <div id="resume-pdf">
              <MDEditor.Markdown
                source={previewContent}
                style={markdownInlineStyle} // Use the state variable for styles
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
