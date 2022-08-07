/* Copyright (c) 2021, ARTCOMPILER INC */
import {assert, message, messages, reserveCodeRange} from "./share.js";
import bent from 'bent';
import d3 from 'd3';
import {
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLList,
  isObjectType,
  isScalarType,
} from 'graphql';
import {
  Checker as BasisChecker,
  Transformer as BasisTransformer,
  Compiler as BasisCompiler
} from '@graffiticode/basis';
//} from '../../../../work/graffiticode/basis/index.js';
const getData = bent('string');

export class Checker extends BasisChecker {
  constructor(nodePool) {
    super(nodePool);
  }
  check(options, resume) {
    const nid = this.nodePool.root;
    this.visit(nid, options, (err, data) => {
      resume(err, data);
    });
  }
  FETCH(node, options, resume) {
    this.visit(node.elts[0], options, async (e0, v0) => {
      const err = [];
      const val = node;
      resume(err, val);
    });
  }
  QUERY(node, options, resume) {
    this.visit(node.elts[0], options, async (e0, v0) => {
      const err = [];
      const val = node;
      resume(err, val);
    });
  }
  SHAPE(node, options, resume) {
    this.visit(node.elts[0], options, async (e0, v0) => {
      const err = [];
      const val = node;
      resume(err, val);
    });
  }
  FLATTEN(node, options, resume) {
    this.visit(node.elts[0], options, async (e0, v0) => {
      const err = [];
      const val = node;
      resume(err, val);
    });
  }
  ENCODE(node, options, resume) {
    this.visit(node.elts[0], options, async (e0, v0) => {
      const err = [];
      const val = node;
      resume(err, val);
    });
  }
  SORT(node, options, resume) {
    this.visit(node.elts[0], options, async (e0, v0) => {
      const err = [];
      const val = node;
      resume(err, val);
    });
  }
  NULL(node, options, resume) {
    const err = [];
    const val = node;
    resume(err, val);
  }
}

function list(parentName, root) {
  let records = [];
  // console.log("list() root=" + JSON.stringify(root, null, 2));
  // if (typeof root[0] === "string" || typeof root[0] === "number") {
  //   records.push({[parentName]: '[' + root.join(', ') + ']'});
  // } else {
    root.forEach(node => {
      if (node instanceof Array) {
        node.forEach(child => {
          records = records.concat(record(parentName, child));
        });
      } else if (typeof node === 'object' && node !== null) {
        records = records.concat(record(parentName, node));
      } else {
        records.push({[parentName]: node});
      }
    });
  // }
  return records;
}
function record(parentName, root) {
  let rows = [];
  Object.keys(root).forEach(key => {
    let records = [];
    const name = `${parentName}/${key}`;
    const node = root[key];
    if (node instanceof Array) {
      records = records.concat(list(name, node));
    } else if (typeof node === 'object' && node !== null) {
      records = records.concat(record(name, node));
    } else {
      records.push({
        [name]: node
      });
    }
    if (rows.length > 0) {
      let newRows = [];
      rows.forEach(row => {
        records.forEach(record => {
          newRows.push(Object.assign({}, row, record));
        });
      });
      rows = newRows;
    } else {
      records.forEach(record => {
        rows.push(record);
      });
    }
  });
  return rows;
}
function table(root) {
  const rows = [];
  if (root instanceof Array) {
    const row = list('', root);
    rows.push(row);
  } else {
    const row = record('', root);
    rows.push(row);
  }
  return rows[0];
}
function tree(rows, paths) {
  const tree = {};
  let hash;
  let root = {};
  rows.forEach(row => {
    let hash = root;
    paths.forEach(path => {
      const value = row[path];
      if (!hash[value]) {
        hash[value] = {};
      }
      hash = hash[value];
    });
  });
  return root;
}

function select(rows, cols, filter) {
  if (!cols || cols.length === 0) {
    return rows;
  }
  const table = [];
  const map = {}
  rows.forEach(row => {
    const record = {};
    cols.forEach(col => {
      record[col] = row[col];
    });
    const key = JSON.stringify(record);
    if (!map[key]) {
      map[key] = true;
      table.push(record);
    }
  });
  return table;
}

export class Transformer extends BasisTransformer {
  constructor(nodePool) {
    super(nodePool);
  }
  check(options, resume) {
    const nid = this.nodePool.root;
    this.visit(nid, options, (err, data) => {
      resume(err, data);
    });
  }
  FETCH(node, options, resume) {
    const TRY_JSON = 1;
    const TRY_CSV = 2;
    this.visit(node.elts[0], options, async (e0, v0) => {
      const url = v0.trim();
      const data = await getData(url);
      let obj;
      const firstTry = url.indexOf('.csv') === url.length - '.csv'.length && TRY_CSV || TRY_JSON;
      try {
        if (TRY_CSV) {
          obj = d3.csvParse(data);
        } else {
          obj = JSON.parse(data);
        }
      } catch (x) {
        try {
          if (TRY_JSON) {
            obj = d3.csvParse(data);
          } else {
            obj = JSON.parse(data);
          }
        } catch (x) {
          console.log("ERROR unrecognized format for data=" + data);
        }
      }
      const err = [];
      const val = obj;
      resume(err, val);
    });
  }
  QUERY(node, options, resume) {
    this.visit(node.elts[0], options, (e0, v0) => {
      this.visit(node.elts[1], options, (e1, v1) => {
        const query = v0;
        const root = v1;
        const schema = schemaFromObject(root);
        graphql(schema, query, root).then((val) => {
          if (val.errors) {
            resume([], val);
          } else {
            resume([].concat(e0).concat(e1), val.data);
          }
        });
      });
    });
    function typeFromValue(name, val) {
      let type;
      if (typeof val === 'boolean') {
        type = GraphQLBoolean;
      } else if (val instanceof Array && val.length > 0) {
        type = typeFromValue(name + "_child", val[0]);
        type = new GraphQLList(type);
      } else if (typeof val === 'object' && val !== null && Object.keys(val).length > 0) {
        type = objectTypeFromObject(name, val);
      } else {
        type = GraphQLString;
      }
      return type;
    }
    function typeFromArrayOfValues(name, vals) {
      // Create a subtype or union type from an array of values.
      const obj = {};
      if (false && vals.length > 1) {
        vals.forEach(val => {
          // For now, assume elements are objects.
          assert(typeof val === 'object' && val !== null && !(val instanceof Array));
          Object.keys(val).forEach(key => {
            if (obj[key] === undefined) {
              obj[key] = val[key];
            }
          });
        });
      } else {
        obj = vals[0];
      }
      return typeFromValue(name, obj);
    }
    function normalizeName(name) {
      return name.replace(/[()\ ]/g, '_');
    }
    function objectTypeFromObject(name, obj) {
      name = normalizeName(name);
      assert(name !== '0' && name !== '"0"');
      const fields = {};
      const args = {};
      let hasArgs = false;
      Object.keys(obj).forEach(key => {
        const type = typeFromValue(name + '_' + key, obj[key]);
        if (type instanceof GraphQLList && type.ofType instanceof GraphQLObjectType) {
          const fields = type.ofType.getFields();
          Object.keys(fields).forEach(key => {
            const field = fields[key];
            if (isScalarType(field.type)) {
              args[field.name] = {type: field.type};
              hasArgs = true;
            }
          });
        }
        if (type) {
          // If type is object, then add an arg for each child field.
          fields[key] = {
            type: type,
            args: hasArgs && args || undefined,
            resolve(obj, args, context, info) {
              const data = obj[key];
              if (Object.keys(args).length === 0) {
                return data;
              }
              const name = Object.keys(args)[0];
              let vals = [];
              if (data instanceof Array) {
                data.forEach(child => {
                  if (child[name] === args[name]) {
                    vals.push(child);
                  }
                });
              }
              if (vals.length > 0) {
                vals = vals;
              } else {
                vals = undefined;
              }
              return vals;
            },
          };
        }
      });
      return new GraphQLObjectType({
        name: name,
        fields: fields,
      });
    }
    function schemaFromObject(obj) {
      const type = objectTypeFromObject('root', obj);
      return new GraphQLSchema({
        query: type,
      });
    }
  }
  SHAPE(node, options, resume) {
    this.visit(node.elts[0], options, (e0, v0) => {
      this.visit(node.elts[1], options, (e1, v1) => {
        const paths = v0;
        const root = v1;
        const err = [].concat(e0).concat(e1);
        const val = tree(table(root, []), paths);
        resume(err, val);
      });
    });
  }
  FLATTEN(node, options, resume) {
    this.visit(node.elts[0], options, (e0, v0) => {
      this.visit(node.elts[1], options, (e1, v1) => {
        const cols = v0;
        const root = v1;
        const err = [].concat(e0).concat(e1);
        const val = select(table(root, []), cols);
        resume(err, val);
      });
    });
  }
  ENCODE(node, options, resume) {
    this.visit(node.elts[0], options, (e0, v0) => {
      this.visit(node.elts[1], options, (e1, v1) => {
        const encoding = v0;
        const root = v1;
        const err = [].concat(e0).concat(e1);
        const val = encoding === 'name-children' && encode(root) || root;
        resume(err, val);
      });
    });
    function encode(root) {
      const node = [];
      if (typeof root !== 'object' || root === null) {
        node.push({
          name: root,
          value: 1,
        });
      } else {
        Object.keys(root).forEach(name => {
          const children = encode(root[name]);
          if (children.length > 0) {
            node.push({
              name: name,
              children: children,
            });
          } else {
            node.push({
              name: name,
              value: 1,
            })
          }
        });
      }
      return node;
    }
  }
  SORT(node, options, resume) {
    this.visit(node.elts[0], options, (e0, v0) => {
      this.visit(node.elts[1], options, (e1, v1) => {
        const order = v0;
        const root = v1;
        const err = [].concat(e0).concat(e1);
        const val = sort(root, order);
        resume(err, val);
      });
    });
    function sort(root, order) {
      if (typeof root !== 'object' || root === null) {
        return root;
      }
      let node;
      if (root instanceof Array) {
        node = root;
        if (order === 'ascending' || order === 'descending') {
          node.forEach((child, index) => {
            if (typeof child === 'object' && child !== null) {
              node[index] = sort(child, order);
            }
          });
          node = node.sort((e1, e2) => {
            if (typeof e1 === 'string' && typeof e2 === 'string') {
              const polarity = order === 'descending' && -1 || 1;
              return polarity * (e1 < e2 && -1 || e1 > e2 && 1 || 0);
            } else {
              return 0;
            }
          });
        }
      } else {
        const node = {};
        let keys = Object.keys(root);
        if (order === 'ascending' || order === 'descending') {
          keys = keys.sort((e1, e2) => {
            if (typeof e1 === 'string' && typeof e2 === 'string') {
              const polarity = order === 'descending' && -1 || 1;
              return polarity * (e1 < e2 && -1 || e1 > e2 && 1 || 0);
            } else {
              return 0;
            }
          });
        }
        keys.forEach(name => {
          let children = root[name];
          if (typeof children === 'object') {
            node[name] = sort(root[name], order);
          } else {
            node[name] = children;
          }
        });
        return node;  // NodeJS bug? Remove this and the following return never executes.
      }
      return node;
    }
  }
  NULL(node, options, resume) {
    const err = [];
    const val = null;
    resume(err, val);
  }
}
export const compiler = new BasisCompiler({
  langID: 0,
  version: 'v0.0.0',
  Checker: Checker,
  Transformer: Transformer,
});
