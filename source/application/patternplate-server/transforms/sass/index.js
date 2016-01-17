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
  return file.buffer.toString('utf-8').replace(/@import(?:.+?)["|'](.*)["|']/g, (match, name) => {
    if (name in dependencies) {
      // check if name is found in pattern dependencies
      const dependency = dependencies[name];
      return resolveDependencies(dependency, dependency.dependencies);
    } else if (name.indexOf('npm://') === 0) {
      // special case `npm://`, for npm dependencies
      try {
        return match.replace(name, require.resolve(name.split('npm://')[1]));
      } catch (err) {
        throw new Error(`Could not resolve npm dependency found in ${file.path}: ${name}`);
      }
    }

    throw new Error(`Unknown dependency found in ${file.path}: ${name}`);
  }) || file.buffer.toString('utf-8');
}

export default function () {
  return async function(file, demo, configuration) {
    // resolve file dependencies
    const fileResolved = resolveDependencies(file, file.dependencies);

    // render file
    const rendered = await renderSass(fileResolved, configuration.opts);

    if (demo) {
      // resolve demo dependencies
      const demoDependencies = {...file.dependencies, Pattern: file};
      const demoResolved = resolveDependencies(demo, demoDependencies);

      // render demo
      const renderedDemo = await renderSass(demoResolved, configuration.opts);

      // return results
      file.demoBuffer = renderedDemo.css;
      file.demoSource = demo.source;
    }

    // jump through patternplate's hoops
    file.buffer = rendered.css;
    file.in = configuration.inFormat;
    file.out = configuration.outFormat;

    return file;
  };
}
