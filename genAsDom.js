import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Config object
const config = {
    extractedPath: "./resources/views_extracted", // Where extracted class JSON files are saved
    cssOutputPath: "./public/generated/combined-output.css", // Where the generated CSS will be saved
};
// Helper function to validate if a class is a valid TailwindCSS class
const isValidTailwindClass = (className) => {
    const validTailwindPattern = /^[a-zA-Z0-9:-]+$/;
    return validTailwindPattern.test(className);
};
// Helper function to generate CSS from Tailwind classes
const generateCSSFromTailwind = (className, classList) => {
    if (!classList || !Array.isArray(classList) || classList.length === 0) {
        // Skip if the classList is undefined, not an array, or empty
        return "";
    }
    classList = classList.filter(isValidTailwindClass);
    const tempCSS = `.${className} { @apply ${classList.join(" ")}; }`;
    console.log(`Generated CSS for ${className}:`, tempCSS); // Log generated CSS
    return tempCSS;
};


// Process the extracted class JSON files
const generateClasses = () => {
    const extractedFiles = fs.readdirSync(config.extractedPath);
    let combinedCSS = "";

  
    extractedFiles.forEach((file) => {
        if (file.endsWith("-classes.json")) {
            const filePath = path.join(config.extractedPath, file);
            const viewName = path.basename(file, "-classes.json");

            const extractedData = JSON.parse(
                fs.readFileSync(filePath, "utf-8")
            );
           

            // Check if JSON has valid class data
            if (Object.keys(extractedData).length === 0) {
                console.log(`No classes found in ${file}`);
                return;
            }

            console.log(`Processing ${file}`); // Log which file is being processed
          
            
            // return
            // Loop through each class entry in the JSON file
            Object.keys(extractedData).forEach((className) => {
                const classData = extractedData[className].originalClasses;
 

                // Only process if classData is valid
                if (classData && Array.isArray(classData)) {
                    const fullClassName = `${className}-${viewName}`;
                    const cssBlock = generateCSSFromTailwind(
                        fullClassName,
                        classData
                    );
                    combinedCSS += cssBlock + "\n";
                } else {
                    console.log(`No valid classes for ${className} in ${file}`);
                }
            });
        }
    });

    // Save the combined CSS to a temp file to process with TailwindCSS
    const tempCSSPath = "./public/generated/temp.css";

    if (combinedCSS.trim() === "") {
        console.log("No valid CSS to process.");
    } else {
        console.log('sadasdads');
        fs.writeFileSync(tempCSSPath, combinedCSS, "utf-8");
        console.log(`Combined CSS written to ${tempCSSPath}`);
    }

    // Use Tailwind's JIT to generate the final CSS
    try {
        execSync(
            `npx tailwindcss -i ${tempCSSPath} -o ${config.cssOutputPath}`
        );
        console.log("Tailwind CSS generated successfully!");
    } catch (error) {
        console.error("Error processing Tailwind CSS:", error.message);
    } finally {
        // Cleanup temp CSS file
        if (fs.existsSync(tempCSSPath)) {
            // fs.unlinkSync(tempCSSPath);
        }
    }
};

// Ensure output directory exists
if (!fs.existsSync(path.dirname(config.cssOutputPath))) {
    fs.mkdirSync(path.dirname(config.cssOutputPath), { recursive: true });
}

// Run the generation process
generateClasses();

console.log("Generation phase complete!");
