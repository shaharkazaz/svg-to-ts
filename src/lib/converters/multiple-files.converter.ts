import * as path from 'path';

import { ConvertionOptions } from '../../bin/svg-to-ts';

import {
  generateExportStatement,
  generateTypeName,
  generateUntypedSvgConstant,
  generateVariableName
} from '../generators/code-snippet-generators';
import { getFilePathsFromRegex } from '../helpers/regex-helpers';
import { deleteFiles, deleteFolder, extractSvgContent, writeFile } from '../helpers/file-helpers';
import { compileSources } from '../compiler/typescript-compiler';
import { info, success } from '../helpers/log-helper';
import { svgOptimizer } from '../helpers/svg-optimization';

const generateIconsFolderName = 'build';

export const convertToMultipleFiles = async (convertionOptions: ConvertionOptions): Promise<void> => {
  const { prefix, delimiter, outputDirectory, srcFiles } = convertionOptions;
  let indexFileContent = '';

  try {
    const filePaths = await getFilePathsFromRegex(srcFiles);
    await deleteFolder(`${outputDirectory}/icons`);
    info(`deleting output directory: ${outputDirectory}`);

    for (let i = 0; i < filePaths.length; i++) {
      const fileNameWithEnding = path.basename(filePaths[i]);
      const [filenameWithoutEnding, extension] = fileNameWithEnding.split('.');

      if (extension === 'svg') {
        const rawSvg = await extractSvgContent(filePaths[i]);
        info(`optimize svg: ${fileNameWithEnding}`);
        const optimizedSvg = await svgOptimizer.optimize(rawSvg);
        const variableName = generateVariableName(prefix, filenameWithoutEnding);
        const typeName = generateTypeName(filenameWithoutEnding, delimiter);
        const svgConstant = generateUntypedSvgConstant(variableName, typeName, optimizedSvg.data);
        const generatedFileName = `${prefix}-${filenameWithoutEnding}.icon`;
        indexFileContent += generateExportStatement(generatedFileName, generateIconsFolderName);
        await writeFile(`${outputDirectory}/${generateIconsFolderName}`, generatedFileName, svgConstant);
        info(`write file svg: ${outputDirectory}/${generateIconsFolderName}/${generatedFileName}.ts`);
      }
    }
    await writeFile(outputDirectory, 'index', indexFileContent);
    info(`write index.ts`);
    const generatedTypeScriptFilePaths = await getFilePathsFromRegex([
      `${outputDirectory}/${generateIconsFolderName}/*.ts`,
      `${outputDirectory}/index.ts`
    ]);
    compileSources(generatedTypeScriptFilePaths);
    info(`compile Typescript - generate JS and d.ts`);
    deleteFiles(generatedTypeScriptFilePaths);
    info(`delete Typescript files`);

    success('========================================================');
    success(`your files were successfully created under: ${outputDirectory}`);
    success(
      `don't forget to copy this folder to your dist in a post build script - enjoy your tree-shakable icon library 😎`
    );
    success('========================================================');
  } catch (error) {
    error('Something went wrong', error);
  }
};