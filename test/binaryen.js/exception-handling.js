function cleanInfo(info) {
  var ret = {};
  for (var x in info) {
    if (x == 'id' || x == 'type' || x == 'name' || x == 'event') {
      ret[x] = info[x];
    }
  }
  return ret;
}

function stringify(expr) {
  return JSON.stringify(cleanInfo(binaryen.getExpressionInfo(expr)));
}

var module = new binaryen.Module();
module.setFeatures(binaryen.Features.ReferenceTypes |
                   binaryen.Features.ExceptionHandling);

var event_ = module.addEvent("e", 0, binaryen.i32, binaryen.none);

// (try
//   (throw $e (i32.const 0))
//   (catch
//     ;; We don't support multi-value yet. Use locals instead.
//     (local.set 0 (exnref.pop))
//     (drop
//       (block $l (result i32)
//         (rethrow
//           (br_on_exn $l $e (local.get 0))
//         )
//       )
//     )
//   )
// )
var throw_ = module.throw("e", [module.i32.const(0)]);
var br_on_exn = module.br_on_exn("l", "e", module.local.get(0, binaryen.exnref));
var rethrow = module.rethrow(br_on_exn);
var try_ = module.try(
  throw_,
  module.block(null, [
    module.local.set(0, module.exnref.pop()),
    module.drop(
      module.block("l", [rethrow], binaryen.i32)
    )
  ]
  )
);
var func = module.addFunction("test", binaryen.none, binaryen.none, [binaryen.exnref], try_);

console.log(module.emitText());
assert(module.validate());

console.log("getExpressionInfo(throw) = " + stringify(throw_));
console.log("getExpressionInfo(br_on_exn) = " + stringify(br_on_exn));
console.log("getExpressionInfo(rethrow) = " + stringify(rethrow));
console.log("getExpressionInfo(try) = " + stringify(try_));
