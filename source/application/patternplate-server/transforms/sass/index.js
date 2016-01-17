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

function resolveDependencies(file, dependencies) {
  return file.buffer.toString('utf-8').replace(/@import(?:.+?)["|'](.*)["|']/g, function(match, name) {
    if (name in dependencies) {
      // check if name is found in pattern dependencies
      let dependency = dependencies[name];
      return resolveDependencies(dependency, dependency.dependencies);
    } else if (name.indexOf('npm://') === 0) {
      // special case `npm://`, for npm dependencies
      try {
        return match.replace(name, require.resolve(name.split('npm://')[1]));
      } catch (err) {
        application.log.error(`Could not resolve npm dependency: ${name}`);
      }
    }

    throw new Error(`Unknown dependency found in ${file.path}: ${name}`);
  }) || buffer;
}

export default function(application) {
  return async function(file, demo, configuration) {
    // resolve file dependencies
    let fileResolved = resolveDependencies(file, file.dependencies);

    // render file
    let rendered = await renderSass(fileResolved, {
      indentedSyntax: true
    });

    if (demo) {
      // resolve demo dependencies
      let demoDependencies = {...file.dependencies, Pattern: file}
      let demoResolved = resolveDependencies(demo, demoDependencies);

      // render demo
      let renderedDemo = await renderSass(demoResolved, {
        indentedSyntax: true
      });

      // return results
      file.demoBuffer = renderedDemo.css;
      file.demoSource = demo.source;
    }

    // jump through patternplate's hoops
    file.buffer = rendered.css;
    file.in = configuration.inFormat;
    file.out = configuration.outFormat;

    return file;
  }
}
