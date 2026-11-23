import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, relative, dirname, join } from 'node:path';
import ts from 'typescript';
const root=resolve('src');
function files(directory:string):string[]{return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(join(directory,entry.name)):/\.tsx?$/.test(entry.name)?[join(directory,entry.name)]:[]);}
test('hexagonal dependency boundaries keep frameworks and concrete adapters outside the application core',()=>{
  const violations:string[]=[];
  for(const file of files(root)){
    const owner=relative(root,file).replaceAll('\\','/'),text=readFileSync(file,'utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
    const imports:string[]=[];
    function visit(node:ts.Node){if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier))imports.push(node.moduleSpecifier.text);if(ts.isCallExpression(node)&&(node.expression.kind===ts.SyntaxKind.ImportKeyword||ts.isIdentifier(node.expression)&&node.expression.text==='require')&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0]))imports.push(node.arguments[0].text);ts.forEachChild(node,visit);}visit(ast);
    for(const specifier of imports){const internal=specifier.startsWith('.')||specifier.startsWith('@/');const target=internal?relative(root,specifier.startsWith('@/')?resolve(root,specifier.slice(2)):resolve(dirname(file),specifier)).replaceAll('\\','/'):specifier;let valid=true;
      if(owner.startsWith('domain/'))valid=internal&&target.startsWith('domain/');
      else if(owner.startsWith('application/'))valid=internal?/^(domain|application)\//.test(target):specifier==='zod';
      else if(owner.startsWith('shared/'))valid=internal&&target.startsWith('shared/');
      else if(owner.startsWith('adapters/inbound/web/'))valid=internal?/^(domain|application|shared)\//.test(target)||target.startsWith('adapters/inbound/web/'):!specifier.startsWith('node:')&&!['pg'].includes(specifier);
      else if(owner.startsWith('adapters/inbound/http/'))valid=internal?/^(domain|application|shared)\//.test(target)||target.startsWith('adapters/inbound/http/'):specifier==='zod'||specifier.startsWith('next/');
      else if(owner.startsWith('adapters/outbound/'))valid=!internal||/^(domain|application)\//.test(target)||target.startsWith('adapters/outbound/');
      else if(owner.startsWith('app/'))valid=!target.startsWith('adapters/outbound/');
      if(!valid)violations.push(`${owner} -> ${specifier}`);
    }
    if(owner.startsWith('application/')&&/process\.env|\b(?:SELECT|INSERT INTO|UPDATE .* SET|DELETE FROM)\b/.test(text))violations.push(owner+' contains runtime configuration or SQL');
  }
  assert.deepEqual(violations,[]);
});
