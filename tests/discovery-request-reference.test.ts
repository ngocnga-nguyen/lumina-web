import assert from "node:assert/strict";
import test from "node:test";
import { appendDiscoveryReference, discoveryReferenceText, discoveryRequestHref, resolveDiscoveryRequestReference } from "../lib/discovery-request-reference.ts";

const id = "11111111-1111-4111-8111-111111111111", artistId = "22222222-2222-4222-8222-222222222222";
const look = { id, image_url: "https://example.com/result.jpg", service_name: "  Gel manicure " };
const services = [{ id: "service-one", service_name: "gel MANICURE" }];

test("only real look and professional IDs become an existing storefront route", () => {
  assert.equal(discoveryRequestHref({ id, artistId }), `/artist/${artistId}?requestLook=${id}`);
  assert.equal(discoveryRequestHref({ id, artistId, demo: true }), null);
  assert.equal(discoveryRequestHref({ id: "demo-look", artistId }), null);
  assert.equal(discoveryRequestHref({ id, artistId: "../login" }), null);
});
test("context comes from this professional's loaded portfolio, never arbitrary URL content", () => {
  assert.equal(resolveDiscoveryRequestReference(id, [], services), null);
  assert.equal(resolveDiscoveryRequestReference("https://untrusted.example/image", [look], services), null);
  assert.deepEqual(resolveDiscoveryRequestReference(id, [look], services), { id, image: look.image_url, title: "Gel manicure", serviceId: "service-one" });
});
test("unmatched, ambiguous or caption-only looks never guess a listed service", () => {
  assert.equal(resolveDiscoveryRequestReference(id, [look], [])?.serviceId, null);
  assert.equal(resolveDiscoveryRequestReference(id, [look], [...services, { id: "another", service_name: "Gel manicure" }])?.serviceId, null);
  assert.equal(resolveDiscoveryRequestReference(id, [{ ...look, service_name: null, caption: "gel manicure" }], services)?.serviceId, null);
});
test("the existing editable Notes field gets one plain reference without overwriting client text", () => {
  const reference = discoveryReferenceText(id, "https://www.joinlumina.co");
  assert.equal(reference, `Look reference: https://www.joinlumina.co/discover?look=${id}`);
  assert.equal(appendDiscoveryReference("Please keep it short.", reference), `Please keep it short.\n\n${reference}`);
  assert.equal(appendDiscoveryReference(reference, reference), reference);
  assert.equal(appendDiscoveryReference("My note", ""), "My note");
  assert.equal(discoveryReferenceText(id, "javascript:alert(1)"), "");
});
