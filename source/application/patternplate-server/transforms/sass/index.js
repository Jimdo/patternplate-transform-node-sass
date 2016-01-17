import {dirname} from 'path';
import {render} from 'node-sass';

function renderSass(data, options) {
  return new Promise((resolve, reject) => {
    render({
      ...options,
      data
    }, (error, result) => {
      if (error) {
        return reject(error);
      }
      resolve(result);
    });
  });
}

export default function(application) {
  return async function(file, demo, configuration) {
    // file.buffer
    // file.source
    // file.demoBuffer
    // file.demoSource
    let fileDependencies = file.dependencies;

    let rendered = await renderSass(file.buffer.toString('utf-8'), {
      indentedSyntax: true,
      includePaths: [dirname(demo.path)]
    });

    file.rendered = rendered.css;

    if (demo) {
      // resolve dependencies
      let demoBuffer = demo.buffer.toString('utf-8');

      let demoResolved = demoBuffer.replace(/@import(?:.+?)["|'](.*)["|']/g, function(match, name) {
        if (name === 'Pattern') {
          // special case `Pattern`, just for demo
          return match.replace(name, './index.sass');
        } else if (name in fileDependencies) {
          // check if name is found in pattern dependencies
          let dependency = fileDependencies[name];
          return match.replace(name, dependency.path);
        } else if (name.indexOf('npm://') === 0) {
          // special case `npm://`, for npm dependencies
          try {
            return match.replace(name, require.resolve(name.split('npm://')[1]));
          } catch (err) {
            application.log.error(`Could not resolve npm dependency: ${name}`);
          }
        }

        throw new Error(`Unknown dependency found in ${demo.path}: ${name}`);
      }) || buffer;

      let renderedDemo = await renderSass(demoResolved, {
        indentedSyntax: true,
        includePaths: [dirname(demo.path)]
      });
      file.demoBuffer = renderedDemo.css;
      file.demoSource = demo.source;
    }

    file.in = configuration.inFormat;
    file.out = configuration.outFormat;

    return file;
  }
}
