import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";

// Config for source and output paths
const config = {
    viewPath: "./resources/views", // Where the original Blade templates are stored
    outputPath: "./resources/views_modified", // Where the modified Blade templates will be saved
    extractedPath: "./resources/views_extracted", // Where the extracted class JSON files will be saved
};

// Helper function to generate random class names
const generateRandomClassName = () => {
    return `auto-gen-${Math.random().toString(36).substring(2, 15)}`;
};

// Helper function to validate if a class is a valid TailwindCSS class
const isValidTailwindClass = (className) => {
    const validTailwindPattern = /^[a-zA-Z0-9:-]+$/;
    return validTailwindPattern.test(className);
};

// Sanitize the class attribute by removing Blade/PHP directives
const sanitizeClassAttribute = (classAttr) => {
    // Remove Blade PHP directives ({{ }} and @directives)
    return classAttr
        .replace(/{{.*?}}/g, "") // Remove PHP/Blade variables like {{ $width }}
        .replace(/@\w+/g, "") // Remove Blade directives like @if, @foreach
        .trim();
};

// Helper function to save modified Blade files to new directory
const saveToNewDirectory = (filePath, content, outputPath) => {
    const relativePath = path.relative(config.viewPath, filePath);
    const newFilePath = path.join(outputPath, relativePath);

    // Ensure directory exists
    const newDir = path.dirname(newFilePath);
    fs.mkdirSync(newDir, { recursive: true });

    // Write modified content to new file
    fs.writeFileSync(newFilePath, content, "utf-8");
    console.log(`Saved to ${newFilePath}`);
};

// Helper function to save extracted classes to a JSON file
const saveExtractedClasses = (filePath, extractedClasses) => {
    const relativePath = path.relative(config.viewPath, filePath);
    const jsonFileName = path.basename(relativePath, ".blade.php") + "-classes.json";
    const outputFilePath = path.join(config.extractedPath, jsonFileName);

    // Ensure the extracted directory exists
    fs.mkdirSync(config.extractedPath, { recursive: true });

    // Write the extracted classes to the JSON file
    fs.writeFileSync(outputFilePath, JSON.stringify(extractedClasses, null, 2), "utf-8");
    console.log(`Extracted classes saved to ${outputFilePath}`);
};

// Extract and modify classes in Blade files, then save to new directory and generate a JSON file
const processBladeFiles = (viewPath, outputPath) => {
    const bladeFiles = getBladeFiles(viewPath, ["index", "wizzard-html"]);

    bladeFiles.forEach((filePath) => {
        let content = fs.readFileSync(filePath, "utf-8");
        const $ = cheerio.load(content, { xmlMode: true, decodeEntities: false });

        const extractedClasses = {};

        // Process elements with or without data-class-name
        $("*[class]").each((index, element) => {
            let $element = $(element);
            let dataClassName = $element.attr("data-class-name");

            // Generate a random class name if not present
            if (!dataClassName) {
                dataClassName = generateRandomClassName();
                $element.attr("data-class-name", dataClassName);
            }

            // Extract the class attribute value
            let currentClasses = $element.attr("class");
            let newClasses = `${dataClassName}-${path.basename(
                filePath,
                ".blade.php"
            )}`;
            $element.attr("class", newClasses);

            currentClasses = sanitizeClassAttribute(currentClasses);

            // Split the class attribute into individual classes and filter out invalid ones
            const classes = currentClasses.split(/\s+/).filter(isValidTailwindClass);

            // Store the extracted classes keyed by data-class-name
            extractedClasses[dataClassName] = {
                originalClasses: classes, // TailwindCSS classes for transformation
                newClass: newClasses,
            };

            // Log changes
            console.log(
                `Updated element <${$element[0].tagName}> with new class: ${newClasses}`
            );
        });

        // Serialize the modified DOM back to HTML (Blade)
        const updatedContent = $.html();

        // Save to the new directory
        saveToNewDirectory(filePath, updatedContent, outputPath);

        // Save the extracted classes to a JSON file
        saveExtractedClasses(filePath, extractedClasses);
    });
};

// Get all Blade files from the specified directory
const getBladeFiles = (viewPath, excludeViews = []) => {
    const files = [];
    const getFilesRecursively = (dir) => {
        const dirents = fs.readdirSync(dir, { withFileTypes: true });
        dirents.forEach((dirent) => {
            const filePath = path.resolve(dir, dirent.name);
            const fileName = path.basename(filePath);

            if (dirent.isDirectory()) {
                getFilesRecursively(filePath);
            } else if (filePath.endsWith(".blade.php")) {
                // Check if the file is not part of the excludeViews list
                const shouldExclude = excludeViews.some((excluded) =>
                    fileName.includes(excluded)
                );

                if (!shouldExclude) {
                    files.push(filePath);
                }
            }
        });
    };

    getFilesRecursively(viewPath);
    return files;
};


// Ensure the output directory exists
if (!fs.existsSync(config.outputPath)) {
    fs.mkdirSync(config.outputPath, { recursive: true });
}

// Ensure the extracted directory exists
if (!fs.existsSync(config.extractedPath)) {
    fs.mkdirSync(config.extractedPath, { recursive: true });
}

// Run the process
processBladeFiles(config.viewPath, config.outputPath);

console.log(
    "Classes extracted, JSON files generated, and Blade files updated with generated random class names!"
);
